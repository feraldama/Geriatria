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

  await tx.patient.update({
    where: { id },
    data: {
      ...coreData(core),
      ...(birthDate ? { birthDate: parseDate(birthDate)! } : {}),
    },
  });

  // Si cambió algún campo que compone la búsqueda, recalculamos searchText
  // a partir de los valores ya persistidos.
  if (core.firstName !== undefined || core.lastName !== undefined || core.documentId !== undefined) {
    const row = await tx.patient.findUniqueOrThrow({
      where: { id },
      select: { firstName: true, lastName: true, documentId: true },
    });
    await tx.patient.update({
      where: { id },
      data: { searchText: buildSearchText([row.firstName, row.lastName, row.documentId]) },
    });
  }

  if (caregivers !== undefined) {
    await tx.caregiver.deleteMany({ where: { patientId: id } });
    if (caregivers.length)
      await tx.caregiver.createMany({
        data: caregivers.map((c) => ({ ...c, patientId: id })),
      });
  }
  if (conditions !== undefined) {
    await tx.condition.deleteMany({ where: { patientId: id } });
    if (conditions.length)
      await tx.condition.createMany({
        data: conditions.map((c) => ({
          patientId: id,
          name: c.name,
          active: c.active,
          notes: c.notes,
          since: c.since ? parseDate(c.since) : null,
        })),
      });
  }
  if (allergies !== undefined) {
    await tx.allergy.deleteMany({ where: { patientId: id } });
    if (allergies.length)
      await tx.allergy.createMany({
        data: allergies.map((a) => ({ ...a, patientId: id })),
      });
  }
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
