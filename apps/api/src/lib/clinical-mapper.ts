/** Serialización de consultas y signos vitales a los tipos de salida. */
import type { Prisma } from "@prisma/client";
import { sanitizePhysicalExam, type ConsultationItem, type VitalSignItem } from "@geriatria/schemas";

/**
 * Las medidas clínicas se guardan como Decimal (exactas en la base) y viajan
 * como number en el JSON de la API, que es lo que consumen los gráficos.
 */
type DecimalLike = { toNumber(): number };

function toNumber(value: DecimalLike | number | null): number | null {
  if (value === null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

type VitalRow = Pick<
  Prisma.VitalSignGetPayload<Record<string, never>>,
  | "id"
  | "measuredAt"
  | "systolic"
  | "diastolic"
  | "heartRate"
  | "respiratoryRate"
  | "temperature"
  | "oxygenSat"
  | "weight"
  | "height"
  | "bmi"
  | "calfCircumference"
  | "bloodGlucose"
  | "gripStrength"
  | "notes"
>;

export function serializeVital(v: VitalRow): VitalSignItem {
  return {
    id: v.id,
    measuredAt: v.measuredAt.toISOString(),
    systolic: v.systolic,
    diastolic: v.diastolic,
    heartRate: v.heartRate,
    respiratoryRate: v.respiratoryRate,
    temperature: toNumber(v.temperature),
    oxygenSat: v.oxygenSat,
    weight: toNumber(v.weight),
    height: toNumber(v.height),
    bmi: toNumber(v.bmi),
    calfCircumference: toNumber(v.calfCircumference),
    bloodGlucose: v.bloodGlucose,
    gripStrength: toNumber(v.gripStrength),
    notes: v.notes,
  };
}

type ConsultationWithVitals = Prisma.ConsultationGetPayload<{ include: { vitalSigns: true } }>;

export function serializeConsultation(c: ConsultationWithVitals): ConsultationItem {
  return {
    id: c.id,
    patientId: c.patientId,
    appointmentId: c.appointmentId,
    date: c.date.toISOString(),
    subjective: c.subjective,
    objective: c.objective,
    assessment: c.assessment,
    plan: c.plan,
    physicalExam: (() => {
      const exam = sanitizePhysicalExam(c.physicalExam);
      return Object.keys(exam).length ? exam : null;
    })(),
    vitalSigns: c.vitalSigns.map(serializeVital),
  };
}
