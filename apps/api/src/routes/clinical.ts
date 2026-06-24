/**
 * Rutas clínicas por paciente (Fase 3): consultas (SOAP), signos vitales y
 * línea de tiempo. Montadas bajo /patients. Requieren permisos clínicos.
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  consultationSchema,
  updateConsultationSchema,
  vitalSignSchema,
  createMedicationSchema,
  updateMedicationSchema,
  suspendMedicationSchema,
  combineDateTime,
  formatTime,
  calculateBMI,
  parseDate,
  getScaleDefinition,
  computeScaleScore,
  isValidScaleDate,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  PERMISSIONS,
  type TimelineEvent,
  type VitalSignInput,
  type MedicationItem,
  type ScaleAnswers,
  type ScaleType,
} from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { validateBody } from "../middleware/validate.js";
import { recordAudit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";
import { serializeConsultation, serializeVital } from "../lib/clinical-mapper.js";

export const clinicalRouter: Router = Router();
clinicalRouter.use(requireAuth);

// Verifica que el paciente exista y esté activo; devuelve su id.
async function ensurePatient(patientId: string): Promise<string> {
  const p = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: { id: true },
  });
  if (!p) throw notFound("Paciente no encontrado");
  return p.id;
}

// Combina fecha (dd/mm/aaaa) + hora opcional. Si no hay hora, usa la hora actual.
function toDateTime(date: string, time?: string): Date {
  const t = time && time.length ? time : formatTime(new Date());
  const dt = combineDateTime(date, t);
  if (!dt) throw badRequest("Fecha u hora inválida");
  return dt;
}

// Construye los datos de un VitalSign desde el input (calcula IMC).
function vitalData(input: Partial<VitalSignInput>, patientId: string, measuredAt: Date) {
  const weight = input.weight ?? null;
  const height = input.height ?? null;
  return {
    patientId,
    measuredAt,
    systolic: input.systolic ?? null,
    diastolic: input.diastolic ?? null,
    heartRate: input.heartRate ?? null,
    respiratoryRate: input.respiratoryRate ?? null,
    temperature: input.temperature ?? null,
    oxygenSat: input.oxygenSat ?? null,
    weight,
    height,
    bmi: calculateBMI(weight, height),
    calfCircumference: input.calfCircumference ?? null,
    notes: input.notes ?? null,
  };
}

// ¿El input de vitales trae al menos una medición?
function hasAnyVital(v?: Partial<VitalSignInput>): boolean {
  if (!v) return false;
  return [
    v.systolic,
    v.diastolic,
    v.heartRate,
    v.respiratoryRate,
    v.temperature,
    v.oxygenSat,
    v.weight,
    v.height,
    v.calfCircumference,
  ].some((x) => x !== null && x !== undefined);
}

// ─── Consultas ─────────────────────────────────────────────────────────────

clinicalRouter.get(
  "/:patientId/consultations",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const consultations = await prisma.consultation.findMany({
        where: { patientId, deletedAt: null },
        include: { vitalSigns: true },
        orderBy: { date: "desc" },
      });
      res.json({ data: consultations.map(serializeConsultation) });
    } catch (err) {
      next(err);
    }
  },
);

clinicalRouter.get(
  "/:patientId/consultations/:cid",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const consultation = await prisma.consultation.findFirst({
        where: { id: String(req.params.cid), patientId, deletedAt: null },
        include: { vitalSigns: true },
      });
      if (!consultation) throw notFound("Consulta no encontrada");
      res.json({ consultation: serializeConsultation(consultation) });
    } catch (err) {
      next(err);
    }
  },
);

clinicalRouter.post(
  "/:patientId/consultations",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateBody(consultationSchema),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const { date, time, appointmentId, subjective, objective, assessment, plan, vitals } =
        req.body;
      const when = toDateTime(date, time);

      // Si se vincula a una cita, debe ser del paciente y no estar ya usada.
      if (appointmentId) {
        const appt = await prisma.appointment.findFirst({
          where: { id: appointmentId, patientId, deletedAt: null },
          include: { consultation: { select: { id: true } } },
        });
        if (!appt) throw badRequest("La cita indicada no pertenece al paciente");
        if (appt.consultation) throw badRequest("La cita ya tiene una consulta asociada");
      }

      const consultation = await prisma.$transaction(async (tx) => {
        const created = await tx.consultation.create({
          data: {
            patientId,
            appointmentId: appointmentId || null,
            date: when,
            subjective,
            objective,
            assessment,
            plan,
            createdById: req.user!.id,
          },
        });
        // Vitales embebidos (si hay al menos una medición).
        if (hasAnyVital(vitals)) {
          await tx.vitalSign.create({
            data: { ...vitalData(vitals!, patientId, when), consultationId: created.id },
          });
        }
        // Al registrar la consulta de una cita, la marcamos como atendida.
        if (appointmentId) {
          await tx.appointment.update({
            where: { id: appointmentId },
            data: { status: "ATENDIDA" },
          });
        }
        return tx.consultation.findUniqueOrThrow({
          where: { id: created.id },
          include: { vitalSigns: true },
        });
      });

      await recordAudit({
        userId: req.user!.id,
        action: "consultation.create",
        resource: "consultation",
        resourceId: consultation.id,
        req,
      });
      res.status(201).json({ consultation: serializeConsultation(consultation) });
    } catch (err) {
      next(err);
    }
  },
);

clinicalRouter.patch(
  "/:patientId/consultations/:cid",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateBody(updateConsultationSchema),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const cid = String(req.params.cid);
      const existing = await prisma.consultation.findFirst({
        where: { id: cid, patientId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw notFound("Consulta no encontrada");

      const { date, time, subjective, objective, assessment, plan } = req.body;
      const data: Prisma.ConsultationUpdateInput = {};
      if (date !== undefined) data.date = toDateTime(date, time);
      if (subjective !== undefined) data.subjective = subjective;
      if (objective !== undefined) data.objective = objective;
      if (assessment !== undefined) data.assessment = assessment;
      if (plan !== undefined) data.plan = plan;

      const updated = await prisma.consultation.update({
        where: { id: cid },
        data,
        include: { vitalSigns: true },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "consultation.update",
        resource: "consultation",
        resourceId: cid,
        req,
      });
      res.json({ consultation: serializeConsultation(updated) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Signos vitales ──────────────────────────────────────────────────────

clinicalRouter.get(
  "/:patientId/vitals",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));

      // Ordenamiento en el backend. PA ordena por sistólica.
      const dir: "asc" | "desc" = req.query.sortDir === "desc" ? "desc" : "asc";
      const allowed = new Set([
        "measuredAt",
        "systolic",
        "heartRate",
        "respiratoryRate",
        "temperature",
        "oxygenSat",
        "weight",
        "height",
        "bmi",
        "calfCircumference",
      ]);
      const field = allowed.has(String(req.query.sortBy)) ? String(req.query.sortBy) : "measuredAt";

      const vitals = await prisma.vitalSign.findMany({
        where: { patientId },
        orderBy: { [field]: dir },
      });
      res.json({ data: vitals.map(serializeVital) });
    } catch (err) {
      next(err);
    }
  },
);

clinicalRouter.post(
  "/:patientId/vitals",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateBody(vitalSignSchema),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const { date, time, ...measurements } = req.body;
      const when = toDateTime(date, time);
      const created = await prisma.vitalSign.create({
        data: { ...vitalData(measurements, patientId, when), createdById: req.user!.id },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "vital.create",
        resource: "vital",
        resourceId: created.id,
        req,
      });
      res.status(201).json({ vital: serializeVital(created) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Línea de tiempo ──────────────────────────────────────────────────────

clinicalRouter.get(
  "/:patientId/timeline",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const [consultations, appointments, scales] = await Promise.all([
        prisma.consultation.findMany({
          where: { patientId, deletedAt: null },
          orderBy: { date: "desc" },
        }),
        prisma.appointment.findMany({
          where: { patientId, deletedAt: null },
          orderBy: { scheduledAt: "desc" },
        }),
        prisma.assessmentScale.findMany({
          where: { patientId, deletedAt: null },
          orderBy: { appliedAt: "desc" },
        }),
      ]);

      const events: TimelineEvent[] = [
        ...consultations.map((c) => ({
          id: c.id,
          type: "consultation" as const,
          date: c.date.toISOString(),
          title: "Consulta",
          detail: c.assessment || c.plan || c.subjective || null,
        })),
        ...appointments.map((a) => ({
          id: a.id,
          type: "appointment" as const,
          date: a.scheduledAt.toISOString(),
          title: `Cita · ${APPOINTMENT_TYPE_LABELS[a.type]}`,
          detail: a.reason,
          status: APPOINTMENT_STATUS_LABELS[a.status],
        })),
        ...scales.map((s) => ({
          id: s.id,
          type: "scale" as const,
          date: s.appliedAt.toISOString(),
          title: `Escala · ${getScaleDefinition(s.type)?.name ?? s.type}`,
          detail: `${s.score}/${s.maxScore}${s.interpretation ? ` · ${s.interpretation}` : ""}`,
        })),
      ].sort((x, y) => y.date.localeCompare(x.date));

      res.json({ data: events });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Medicación ──────────────────────────────────────────────────────────

function serializeMedication(m: {
  id: string;
  drug: string;
  dose: string | null;
  frequency: string | null;
  route: MedicationItem["route"];
  startDate: Date | null;
  prescribedBy: string | null;
  status: MedicationItem["status"];
  suspendedAt: Date | null;
  suspendedReason: string | null;
  alertNote: string | null;
  notes: string | null;
}): MedicationItem {
  return {
    id: m.id,
    drug: m.drug,
    dose: m.dose,
    frequency: m.frequency,
    route: m.route,
    startDate: m.startDate ? m.startDate.toISOString() : null,
    prescribedBy: m.prescribedBy,
    status: m.status,
    suspendedAt: m.suspendedAt ? m.suspendedAt.toISOString() : null,
    suspendedReason: m.suspendedReason,
    alertNote: m.alertNote,
    notes: m.notes,
  };
}

clinicalRouter.get(
  "/:patientId/medications",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const meds = await prisma.medication.findMany({
        where: { patientId, deletedAt: null },
        // Activas primero; dentro de cada grupo, por fármaco.
        orderBy: [{ status: "asc" }, { drug: "asc" }],
      });
      res.json({ data: meds.map(serializeMedication) });
    } catch (err) {
      next(err);
    }
  },
);

clinicalRouter.post(
  "/:patientId/medications",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateBody(createMedicationSchema),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const { drug, dose, frequency, route, startDate, prescribedBy, alertNote, notes } = req.body;
      const created = await prisma.medication.create({
        data: {
          patientId,
          drug,
          dose,
          frequency,
          route: route ?? null,
          startDate: startDate ? parseDate(startDate) : null,
          prescribedBy,
          alertNote,
          notes,
          createdById: req.user!.id,
        },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "medication.create",
        resource: "medication",
        resourceId: created.id,
        req,
      });
      res.status(201).json({ medication: serializeMedication(created) });
    } catch (err) {
      next(err);
    }
  },
);

// Verifica que el medicamento exista y pertenezca al paciente.
async function ensureMedication(patientId: string, mid: string): Promise<void> {
  const m = await prisma.medication.findFirst({
    where: { id: mid, patientId, deletedAt: null },
    select: { id: true },
  });
  if (!m) throw notFound("Medicamento no encontrado");
}

clinicalRouter.patch(
  "/:patientId/medications/:mid",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateBody(updateMedicationSchema),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const mid = String(req.params.mid);
      await ensureMedication(patientId, mid);

      const b = req.body;
      const updated = await prisma.medication.update({
        where: { id: mid },
        data: {
          ...(b.drug !== undefined ? { drug: b.drug } : {}),
          ...(b.dose !== undefined ? { dose: b.dose } : {}),
          ...(b.frequency !== undefined ? { frequency: b.frequency } : {}),
          ...(b.route !== undefined ? { route: b.route ?? null } : {}),
          ...(b.startDate !== undefined ? { startDate: b.startDate ? parseDate(b.startDate) : null } : {}),
          ...(b.prescribedBy !== undefined ? { prescribedBy: b.prescribedBy } : {}),
          ...(b.alertNote !== undefined ? { alertNote: b.alertNote } : {}),
          ...(b.notes !== undefined ? { notes: b.notes } : {}),
        },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "medication.update",
        resource: "medication",
        resourceId: mid,
        req,
      });
      res.json({ medication: serializeMedication(updated) });
    } catch (err) {
      next(err);
    }
  },
);

clinicalRouter.post(
  "/:patientId/medications/:mid/suspend",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateBody(suspendMedicationSchema),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const mid = String(req.params.mid);
      await ensureMedication(patientId, mid);

      const { suspendedReason, suspendedDate } = req.body;
      const updated = await prisma.medication.update({
        where: { id: mid },
        data: {
          status: "SUSPENDIDA",
          suspendedReason,
          suspendedAt: suspendedDate ? parseDate(suspendedDate) : new Date(),
        },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "medication.suspend",
        resource: "medication",
        resourceId: mid,
        req,
      });
      res.json({ medication: serializeMedication(updated) });
    } catch (err) {
      next(err);
    }
  },
);

clinicalRouter.post(
  "/:patientId/medications/:mid/reactivate",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const mid = String(req.params.mid);
      await ensureMedication(patientId, mid);

      const updated = await prisma.medication.update({
        where: { id: mid },
        data: { status: "ACTIVA", suspendedAt: null, suspendedReason: null },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "medication.reactivate",
        resource: "medication",
        resourceId: mid,
        req,
      });
      res.json({ medication: serializeMedication(updated) });
    } catch (err) {
      next(err);
    }
  },
);

clinicalRouter.delete(
  "/:patientId/medications/:mid",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const mid = String(req.params.mid);
      await ensureMedication(patientId, mid);
      await prisma.medication.update({ where: { id: mid }, data: { deletedAt: new Date() } });
      await recordAudit({
        userId: req.user!.id,
        action: "medication.delete",
        resource: "medication",
        resourceId: mid,
        req,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Escalas de valoración geriátrica ──────────────────────────────────────

function serializeScale(s: {
  id: string;
  type: string;
  score: number;
  maxScore: number;
  appliedAt: Date;
  interpretation: string | null;
  notes: string | null;
  answers?: unknown;
}, includeAnswers = false) {
  return {
    id: s.id,
    type: s.type as ScaleType,
    score: s.score,
    maxScore: s.maxScore,
    appliedAt: s.appliedAt.toISOString(),
    interpretation: s.interpretation,
    notes: s.notes,
    ...(includeAnswers ? { answers: (s.answers ?? {}) as ScaleAnswers } : {}),
  };
}

// GET /:patientId/scales  → todas las escalas aplicadas (sin respuestas).
clinicalRouter.get(
  "/:patientId/scales",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const scales = await prisma.assessmentScale.findMany({
        where: { patientId, deletedAt: null },
        orderBy: { appliedAt: "desc" },
      });
      res.json({ data: scales.map((s) => serializeScale(s)) });
    } catch (err) {
      next(err);
    }
  },
);

// GET /:patientId/scales/:sid  → detalle con respuestas.
clinicalRouter.get(
  "/:patientId/scales/:sid",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const scale = await prisma.assessmentScale.findFirst({
        where: { id: String(req.params.sid), patientId, deletedAt: null },
      });
      if (!scale) throw notFound("Escala no encontrada");
      res.json({ scale: serializeScale(scale, true) });
    } catch (err) {
      next(err);
    }
  },
);

// POST /:patientId/scales  → aplicar una escala. El puntaje se RE-CALCULA en
// el backend a partir de las respuestas (no se confía en el cliente).
clinicalRouter.post(
  "/:patientId/scales",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const { type, date, answers, notes } = req.body ?? {};

      const def = getScaleDefinition(String(type));
      if (!def) throw badRequest("Tipo de escala desconocido");
      if (typeof date !== "string" || !isValidScaleDate(date)) {
        throw badRequest("Fecha inválida (dd/mm/aaaa)");
      }
      if (typeof answers !== "object" || answers === null) {
        throw badRequest("Respuestas inválidas");
      }

      let score: number;
      try {
        score = computeScaleScore(def, answers as ScaleAnswers);
      } catch (e) {
        throw badRequest(e instanceof Error ? e.message : "Respuestas inválidas");
      }

      const created = await prisma.assessmentScale.create({
        data: {
          patientId,
          type: def.type,
          score,
          maxScore: def.maxScore,
          appliedAt: toDateTime(date),
          answers: answers as object,
          interpretation: def.interpret(score),
          notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
          createdById: req.user!.id,
        },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "scale.create",
        resource: "scale",
        resourceId: created.id,
        req,
      });
      res.status(201).json({ scale: serializeScale(created, true) });
    } catch (err) {
      next(err);
    }
  },
);
