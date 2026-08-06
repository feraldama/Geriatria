/**
 * Conversión entre el payload validado (Zod) y los datos de Prisma, y
 * serialización de Patient → tipos de salida (fechas a ISO, etc.).
 */
import type { Prisma } from "@prisma/client";
import {
  parseDate,
  type CreatePatientInput,
  type UpdatePatientInput,
  type PatientDetail,
  type PatientListItem,
} from "@geriatria/schemas";

// Marcas diacríticas combinantes (U+0300–U+036F). Se construye con escapes
// ASCII vía new RegExp para no depender de la codificación del archivo fuente.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Normaliza texto para búsqueda: minúsculas y sin acentos/diacríticos.
 * Así "González" y "gonzalez" coinciden, igual que "Benítez" y "benitez".
 */
export function normalizeSearch(input: string): string {
  return input.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();
}

function buildSearchText(parts: (string | null | undefined)[]): string {
  return normalizeSearch(parts.filter(Boolean).join(" "));
}

// Campos del núcleo del paciente (sin relaciones) presentes en el input.
type CoreInput = Omit<UpdatePatientInput, "caregivers" | "conditions" | "allergies" | "birthDate">;

// Construye el objeto de campos escalares para create/update (omite relaciones).
function coreData(input: CoreInput): Prisma.PatientUpdateInput {
  const data: Prisma.PatientUpdateInput = {};
  // Copiamos solo las claves presentes en el input (semántica PATCH).
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      (data as Record<string, unknown>)[key] = value;
    }
  }
  return data;
}

/** Datos para crear un paciente con sus relaciones embebidas. */
export function toCreateData(
  input: CreatePatientInput,
  userId: string,
): Prisma.PatientCreateInput {
  const { caregivers, conditions, allergies, birthDate, ...core } = input;
  return {
    ...(coreData(core) as Prisma.PatientCreateInput),
    birthDate: parseDate(birthDate)!,
    searchText: buildSearchText([input.firstName, input.lastName, input.documentId]),
    createdBy: { connect: { id: userId } },
    caregivers: { create: caregivers },
    conditions: {
      create: conditions.map((c) => ({
        name: c.name,
        active: c.active,
        notes: c.notes,
        since: c.since ? parseDate(c.since) : null,
      })),
    },
    allergies: { create: allergies },
  };
}

/**
 * Aplica una actualización dentro de una transacción: campos del núcleo y,
 * si vienen, reemplaza por completo cada colección (estrategia simple y clara).
 */
export async function applyUpdate(
  tx: Prisma.TransactionClient,
  id: string,
  input: UpdatePatientInput,
): Promise<void> {
  const { caregivers, conditions, allergies, birthDate, ...core } = input;

  // Si cambió algún campo que compone la búsqueda, recalculamos searchText en
  // el mismo UPDATE fusionando lo que llega con lo ya persistido.
  const searchChanged =
    core.firstName !== undefined || core.lastName !== undefined || core.documentId !== undefined;
  let searchText: string | undefined;
  if (searchChanged) {
    const row = await tx.patient.findUniqueOrThrow({
      where: { id },
      select: { firstName: true, lastName: true, documentId: true },
    });
    searchText = buildSearchText([
      core.firstName ?? row.firstName,
      core.lastName ?? row.lastName,
      core.documentId !== undefined ? core.documentId : row.documentId,
    ]);
  }

  await tx.patient.update({
    where: { id },
    data: {
      ...coreData(core),
      ...(birthDate ? { birthDate: parseDate(birthDate)! } : {}),
      ...(searchText !== undefined ? { searchText } : {}),
    },
  });

  if (caregivers !== undefined) {
    await reconcile({
      current: await tx.caregiver.findMany({ where: { patientId: id, deletedAt: null } }),
      incoming: caregivers,
      keyOf: (c) => normalizeSearch(c.name),
      remove: (ids) =>
        tx.caregiver.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } }),
      update: (rowId, c) => tx.caregiver.update({ where: { id: rowId }, data: { ...c } }),
      create: (items) =>
        tx.caregiver.createMany({ data: items.map((c) => ({ ...c, patientId: id })) }),
    });
  }
  if (conditions !== undefined) {
    await reconcile({
      current: await tx.condition.findMany({ where: { patientId: id, deletedAt: null } }),
      incoming: conditions,
      keyOf: (c) => normalizeSearch(c.name),
      remove: (ids) =>
        tx.condition.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } }),
      update: (rowId, c) =>
        tx.condition.update({
          where: { id: rowId },
          data: {
            name: c.name,
            active: c.active,
            notes: c.notes,
            since: c.since ? parseDate(c.since) : null,
          },
        }),
      create: (items) =>
        tx.condition.createMany({
          data: items.map((c) => ({
            patientId: id,
            name: c.name,
            active: c.active,
            notes: c.notes,
            since: c.since ? parseDate(c.since) : null,
          })),
        }),
    });
  }
  if (allergies !== undefined) {
    await reconcile({
      current: await tx.allergy.findMany({ where: { patientId: id, deletedAt: null } }),
      incoming: allergies,
      keyOf: (a) => normalizeSearch(a.substance),
      remove: (ids) =>
        tx.allergy.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } }),
      update: (rowId, a) => tx.allergy.update({ where: { id: rowId }, data: { ...a } }),
      create: (items) =>
        tx.allergy.createMany({ data: items.map((a) => ({ ...a, patientId: id })) }),
    });
  }
}

/**
 * Reconcilia una colección del paciente contra la que envía el formulario.
 *
 * El payload no trae ids, así que se emparejan las filas por su clave natural
 * (el nombre del cuidador/condición, la sustancia de la alergia). Lo que sigue
 * presente se actualiza en su lugar y lo que desapareció se da de baja lógica:
 * nunca se borra físicamente. Saber cuándo se quitó una alergia es un dato de
 * seguridad del paciente, y borrar y recrear perdería esa traza en cada
 * guardado del formulario.
 */
export async function reconcile<TRow extends { id: string }, TInput>(opts: {
  current: TRow[];
  incoming: TInput[];
  keyOf: (item: TRow | TInput) => string;
  remove: (ids: string[]) => Promise<unknown>;
  update: (id: string, item: TInput) => Promise<unknown>;
  create: (items: TInput[]) => Promise<unknown>;
}): Promise<void> {
  const { current, incoming, keyOf, remove, update, create } = opts;

  // El formulario puede mandar la misma sustancia dos veces ("Penicilina" y
  // "penicilina"): se queda la primera. Sin esto, cada guardado agregaba una
  // fila más y el duplicado terminaba siendo imposible de borrar desde la UI.
  const deduped: TInput[] = [];
  const seen = new Set<string>();
  for (const item of incoming) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  // Una clave puede tener más de una fila vigente si se colaron duplicados
  // antes de esta lógica; se agrupan todas para poder limpiarlas.
  const currentByKey = new Map<string, TRow[]>();
  for (const row of current) {
    const key = keyOf(row);
    const bucket = currentByKey.get(key);
    if (bucket) bucket.push(row);
    else currentByKey.set(key, [row]);
  }

  const toCreate: TInput[] = [];
  const updates: { id: string; item: TInput }[] = [];
  const keptIds = new Set<string>();

  for (const item of deduped) {
    // Se reutiliza la primera fila con esa clave; las demás quedan para baja.
    const row = currentByKey.get(keyOf(item))?.[0];
    if (row) {
      keptIds.add(row.id);
      updates.push({ id: row.id, item });
    } else {
      toCreate.push(item);
    }
  }

  const removedIds = current.filter((row) => !keptIds.has(row.id)).map((row) => row.id);

  // En paralelo: son decenas de UPDATE dentro de una transacción interactiva y
  // encadenarlos secuencialmente puede agotar su tiempo límite.
  await Promise.all(updates.map(({ id, item }) => update(id, item)));
  if (removedIds.length) await remove(removedIds);
  if (toCreate.length) await create(toCreate);
}

// Tipo del paciente con relaciones cargadas (para serializar).
type PatientWithRelations = Prisma.PatientGetPayload<{
  include: { caregivers: true; conditions: true; allergies: true };
}>;

export function serializeDetail(p: PatientWithRelations): PatientDetail {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    documentId: p.documentId,
    birthDate: p.birthDate.toISOString(),
    sex: p.sex,
    maritalStatus: p.maritalStatus,
    photoUrl: p.photoUrl,
    birthPlace: p.birthPlace,
    education: p.education,
    educationYears: p.educationYears,
    occupation: p.occupation,
    address: p.address,
    phone: p.phone,
    phoneAlt: p.phoneAlt,
    email: p.email,
    emergencyName: p.emergencyName,
    emergencyPhone: p.emergencyPhone,
    emergencyRelation: p.emergencyRelation,
    insuranceProvider: p.insuranceProvider,
    insuranceNumber: p.insuranceNumber,
    livesWith: p.livesWith,
    dependencyLevel: p.dependencyLevel,
    housingSituation: p.housingSituation,
    medicalHistory: p.medicalHistory,
    surgicalHistory: p.surgicalHistory,
    familyHistory: p.familyHistory,
    smoking: p.smoking,
    alcohol: p.alcohol,
    physicalExercise: p.physicalExercise,
    habitsNotes: p.habitsNotes,
    notes: p.notes,
    caregivers: p.caregivers.map((c) => ({
      id: c.id,
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      livesWith: c.livesWith,
      isPrimary: c.isPrimary,
      notes: c.notes,
    })),
    conditions: p.conditions.map((c) => ({
      id: c.id,
      name: c.name,
      since: c.since ? c.since.toISOString() : null,
      active: c.active,
      notes: c.notes ?? undefined,
    })),
    allergies: p.allergies.map((a) => ({
      id: a.id,
      substance: a.substance,
      reaction: a.reaction ?? undefined,
      severity: a.severity ?? undefined,
      notes: a.notes ?? undefined,
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeListItem(
  p: Prisma.PatientGetPayload<{ include: { _count: { select: { allergies: true } } } }>,
): PatientListItem {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    documentId: p.documentId,
    birthDate: p.birthDate.toISOString(),
    sex: p.sex,
    phone: p.phone,
    allergyCount: p._count.allergies,
  };
}
