/**
 * Esquemas Zod y tipos para Consultas (SOAP) y Signos vitales (Fase 3).
 */
import { z } from "zod";
import { isValidDateString, isValidTimeString } from "./date";

// ─── Signos vitales ──────────────────────────────────────────────────────────

// Número opcional que acepta "" (campo vacío) → null. Con rango de validación.
function optionalNumber(min: number, max: number, msg: string) {
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(min, msg).max(max, msg).nullable(),
  );
}

export const vitalSignSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria").refine(isValidDateString, "Fecha inválida (dd/mm/aaaa)"),
  time: z
    .string()
    .optional()
    .transform((v) => (v ? v : ""))
    .refine((v) => v === "" || isValidTimeString(v), "Hora inválida (HH:mm)"),
  systolic: optionalNumber(50, 300, "Valor fuera de rango"),
  diastolic: optionalNumber(30, 200, "Valor fuera de rango"),
  heartRate: optionalNumber(20, 250, "Valor fuera de rango"),
  respiratoryRate: optionalNumber(5, 80, "Valor fuera de rango"),
  temperature: optionalNumber(30, 45, "Valor fuera de rango"),
  oxygenSat: optionalNumber(50, 100, "Valor fuera de rango"),
  weight: optionalNumber(1, 400, "Valor fuera de rango"),
  height: optionalNumber(30, 250, "Valor fuera de rango"),
  calfCircumference: optionalNumber(10, 80, "Valor fuera de rango"),
  bloodGlucose: optionalNumber(20, 600, "Valor fuera de rango"),
  gripStrength: optionalNumber(0, 100, "Valor fuera de rango"),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});
export type VitalSignInput = z.infer<typeof vitalSignSchema>;

export interface VitalSignItem {
  id: string;
  measuredAt: string; // ISO
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
  bloodGlucose: number | null;
  gripStrength: number | null;
  notes: string | null;
}

/** Metadatos de cada signo vital para render de tablas (etiqueta + unidad). */
export const VITAL_FIELDS = [
  { key: "bp", label: "PA", unit: "mmHg" },
  { key: "heartRate", label: "FC", unit: "lpm" },
  { key: "respiratoryRate", label: "FR", unit: "rpm" },
  { key: "temperature", label: "Tº", unit: "°C" },
  { key: "oxygenSat", label: "SatO₂", unit: "%" },
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "height", label: "Talla", unit: "cm" },
  { key: "bmi", label: "IMC", unit: "" },
  { key: "calfCircumference", label: "C. pantorrilla", unit: "cm" },
  { key: "bloodGlucose", label: "Glicemia capilar", unit: "mg/dL" },
  { key: "gripStrength", label: "Fuerza de agarre", unit: "kg" },
] as const;

/** Calcula el IMC a partir de peso (kg) y talla (cm). Null si falta alguno. */
export function calculateBMI(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null;
  const m = height / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}

// ─── Consultas (SOAP) ──────────────────────────────────────────────────────

export const consultationSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria").refine(isValidDateString, "Fecha inválida (dd/mm/aaaa)"),
  time: z
    .string()
    .optional()
    .transform((v) => (v ? v : ""))
    .refine((v) => v === "" || isValidTimeString(v), "Hora inválida (HH:mm)"),
  appointmentId: z.string().optional().nullable(),
  subjective: z.string().trim().max(5000).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  objective: z.string().trim().max(5000).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  assessment: z.string().trim().max(5000).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  plan: z.string().trim().max(5000).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  // Signos vitales tomados en la consulta (opcional, embebidos).
  vitals: vitalSignSchema.partial().optional(),
});
export type ConsultationInput = z.infer<typeof consultationSchema>;

export const updateConsultationSchema = consultationSchema.partial();
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;

export interface ConsultationItem {
  id: string;
  patientId: string;
  appointmentId: string | null;
  date: string; // ISO
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  vitalSigns: VitalSignItem[];
}

// ─── Línea de tiempo ──────────────────────────────────────────────────────

export type TimelineEventType = "consultation" | "appointment" | "scale";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string; // ISO
  title: string;
  detail: string | null;
  status?: string; // para citas
}
