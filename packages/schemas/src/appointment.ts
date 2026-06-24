/**
 * Esquemas Zod y tipos compartidos para Agenda / Citas (Fase 2).
 * La cita se envía con fecha `dd/mm/aaaa` + hora `HH:mm`; el backend las
 * combina y guarda en UTC.
 */
import { z } from "zod";
import { isValidDateString, isValidTimeString } from "./date";

export const APPOINTMENT_TYPE = [
  "PRIMERA_VEZ",
  "CONTROL",
  "DOMICILIARIA",
  "TELECONSULTA",
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPE)[number];
export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  PRIMERA_VEZ: "Primera vez",
  CONTROL: "Control",
  DOMICILIARIA: "Domiciliaria",
  TELECONSULTA: "Teleconsulta",
};

export const APPOINTMENT_STATUS = [
  "PROGRAMADA",
  "CONFIRMADA",
  "ATENDIDA",
  "AUSENTE",
  "CANCELADA",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PROGRAMADA: "Programada",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  AUSENTE: "Ausente",
  CANCELADA: "Cancelada",
};

// Duraciones sugeridas (minutos) para el selector.
export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90] as const;

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Seleccioná un paciente"),
  date: z.string().min(1, "La fecha es obligatoria").refine(isValidDateString, "Fecha inválida (dd/mm/aaaa)"),
  time: z.string().min(1, "La hora es obligatoria").refine(isValidTimeString, "Hora inválida (HH:mm)"),
  durationMin: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
  type: z.enum(APPOINTMENT_TYPE),
  status: z.enum(APPOINTMENT_STATUS).default("PROGRAMADA"),
  reason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = createAppointmentSchema.partial();
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// Cambio rápido de estado (confirmar, marcar atendida/ausente, cancelar).
export const updateStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUS),
});

// ─── Tipos de salida ─────────────────────────────────────────────────────────

export interface AppointmentItem {
  id: string;
  patientId: string;
  patientName: string; // "Apellido, Nombre" para mostrar en la agenda
  scheduledAt: string; // ISO
  durationMin: number;
  reason: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
}
