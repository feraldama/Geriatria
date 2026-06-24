/**
 * Esquemas Zod y tipos para Medicación / polifarmacia (Fase 4).
 */
import { z } from "zod";
import { isValidDateString } from "./date";

export const MEDICATION_ROUTE = [
  "ORAL",
  "SUBLINGUAL",
  "INTRAVENOSA",
  "INTRAMUSCULAR",
  "SUBCUTANEA",
  "TOPICA",
  "INHALATORIA",
  "OFTALMICA",
  "OTICA",
  "RECTAL",
  "OTRA",
] as const;
export type MedicationRoute = (typeof MEDICATION_ROUTE)[number];
export const MEDICATION_ROUTE_LABELS: Record<MedicationRoute, string> = {
  ORAL: "Oral",
  SUBLINGUAL: "Sublingual",
  INTRAVENOSA: "Intravenosa",
  INTRAMUSCULAR: "Intramuscular",
  SUBCUTANEA: "Subcutánea",
  TOPICA: "Tópica",
  INHALATORIA: "Inhalatoria",
  OFTALMICA: "Oftálmica",
  OTICA: "Ótica",
  RECTAL: "Rectal",
  OTRA: "Otra",
};

export const MEDICATION_STATUS = ["ACTIVA", "SUSPENDIDA"] as const;
export type MedicationStatus = (typeof MEDICATION_STATUS)[number];

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.enum(values).optional(),
  );
}

const optDate = z
  .string()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v))
  .refine((v) => v === null || isValidDateString(v), "Fecha inválida (dd/mm/aaaa)");

export const createMedicationSchema = z.object({
  drug: z.string().trim().min(1, "El fármaco es obligatorio").max(200),
  dose: optText(100),
  frequency: optText(100),
  route: optionalEnum(MEDICATION_ROUTE),
  startDate: optDate,
  prescribedBy: optText(120),
  alertNote: optText(300),
  notes: optText(1000),
});
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;

export const updateMedicationSchema = createMedicationSchema.partial();
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;

// Suspensión / reactivación de un medicamento.
export const suspendMedicationSchema = z.object({
  suspendedReason: z.string().trim().min(1, "Indicá el motivo de suspensión").max(300),
  suspendedDate: optDate, // fecha de suspensión (por defecto hoy)
});
export type SuspendMedicationInput = z.infer<typeof suspendMedicationSchema>;

export interface MedicationItem {
  id: string;
  drug: string;
  dose: string | null;
  frequency: string | null;
  route: MedicationRoute | null;
  startDate: string | null; // ISO
  prescribedBy: string | null;
  status: MedicationStatus;
  suspendedAt: string | null; // ISO
  suspendedReason: string | null;
  alertNote: string | null;
  notes: string | null;
}
