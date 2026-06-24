/** Serialización de consultas y signos vitales a los tipos de salida. */
import type { Prisma } from "@prisma/client";
import type { ConsultationItem, VitalSignItem } from "@geriatria/schemas";

export function serializeVital(v: {
  id: string;
  measuredAt: Date;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  temperature: number | null;
  oxygenSat: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  calfCircumference: number | null;
  notes: string | null;
}): VitalSignItem {
  return {
    id: v.id,
    measuredAt: v.measuredAt.toISOString(),
    systolic: v.systolic,
    diastolic: v.diastolic,
    heartRate: v.heartRate,
    respiratoryRate: v.respiratoryRate,
    temperature: v.temperature,
    oxygenSat: v.oxygenSat,
    weight: v.weight,
    height: v.height,
    bmi: v.bmi,
    calfCircumference: v.calfCircumference,
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
    vitalSigns: c.vitalSigns.map(serializeVital),
  };
}
