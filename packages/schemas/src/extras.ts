/**
 * Esquemas y tipos para Vacunación, Plan de cuidados y Panel de alertas
 * (Fase 8).
 */
import { z } from "zod";
import { isValidDateString } from "./date";

const optDate = z
  .string()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v))
  .refine((v) => v === null || isValidDateString(v), "Fecha inválida (dd/mm/aaaa)");

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

// ─── Vacunación ───────────────────────────────────────────────────────────────

export const vaccinationSchema = z.object({
  vaccine: z.string().trim().min(1, "El nombre de la vacuna es obligatorio").max(160),
  doseDate: optDate,
  nextDoseDate: optDate,
  notes: optText(500),
});
export type VaccinationInput = z.infer<typeof vaccinationSchema>;
export const updateVaccinationSchema = vaccinationSchema.partial();
export type UpdateVaccinationInput = z.infer<typeof updateVaccinationSchema>;

export interface VaccinationItem {
  id: string;
  vaccine: string;
  doseDate: string | null;
  nextDoseDate: string | null;
  notes: string | null;
}

// Vacunas frecuentes en el adulto mayor (sugerencias para el formulario).
export const COMMON_VACCINES = [
  "Influenza (gripe)",
  "Neumococo",
  "COVID-19",
  "Herpes zóster",
  "Tétanos / difteria (dT)",
  "Hepatitis B",
] as const;

// ─── Plan de cuidados ─────────────────────────────────────────────────────────

export const carePlanSchema = z.object({
  objectives: optText(4000),
  indications: optText(4000),
  nextControls: optText(2000),
  nextControlDate: optDate,
});
export type CarePlanInput = z.infer<typeof carePlanSchema>;

export interface CarePlanItem {
  objectives: string | null;
  indications: string | null;
  nextControls: string | null;
  nextControlDate: string | null;
  updatedAt: string | null;
}

// ─── Panel de alertas ────────────────────────────────────────────────────────

export type AlertKind = "vaccine" | "control" | "scale";
export type AlertSeverity = "warning" | "bad";

export interface AlertItem {
  kind: AlertKind;
  severity: AlertSeverity;
  patientId: string;
  patientName: string;
  message: string;
  date: string | null; // ISO de referencia (vencimiento, control…)
}
