/**
 * Esquemas Zod y tipos compartidos para Pacientes (Fase 1).
 * Se usan en el backend (validación de cada endpoint) y en el frontend
 * (formularios). Las fechas se manejan como string `dd/mm/aaaa` en el borde.
 */
import { z } from "zod";
import { isValidDateString } from "./date";

// ─── Enums + etiquetas en español (para selects en la UI) ───────────────────

export const SEX = ["MASCULINO", "FEMENINO", "OTRO"] as const;
export type Sex = (typeof SEX)[number];
export const SEX_LABELS: Record<Sex, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  OTRO: "Otro",
};

export const MARITAL_STATUS = [
  "SOLTERO",
  "CASADO",
  "VIUDO",
  "DIVORCIADO",
  "UNION_LIBRE",
  "OTRO",
] as const;
export type MaritalStatus = (typeof MARITAL_STATUS)[number];
export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  SOLTERO: "Soltero/a",
  CASADO: "Casado/a",
  VIUDO: "Viudo/a",
  DIVORCIADO: "Divorciado/a",
  UNION_LIBRE: "Unión libre",
  OTRO: "Otro",
};

export const DEPENDENCY_LEVEL = [
  "INDEPENDIENTE",
  "LEVE",
  "MODERADA",
  "SEVERA",
  "TOTAL",
] as const;
export type DependencyLevel = (typeof DEPENDENCY_LEVEL)[number];
export const DEPENDENCY_LEVEL_LABELS: Record<DependencyLevel, string> = {
  INDEPENDIENTE: "Independiente",
  LEVE: "Dependencia leve",
  MODERADA: "Dependencia moderada",
  SEVERA: "Dependencia severa",
  TOTAL: "Dependencia total",
};

export const HABIT_STATUS = ["NUNCA", "EX", "ACTIVO"] as const;
export type HabitStatus = (typeof HABIT_STATUS)[number];
export const HABIT_STATUS_LABELS: Record<HabitStatus, string> = {
  NUNCA: "Nunca",
  EX: "Ex consumidor",
  ACTIVO: "Activo",
};

export const ALLERGY_SEVERITY = ["LEVE", "MODERADA", "SEVERA"] as const;
export type AllergySeverity = (typeof ALLERGY_SEVERITY)[number];
export const ALLERGY_SEVERITY_LABELS: Record<AllergySeverity, string> = {
  LEVE: "Leve",
  MODERADA: "Moderada",
  SEVERA: "Severa",
};

// ─── Helpers de campos ───────────────────────────────────────────────────────

// String opcional que normaliza "" (o ausencia) → null. Devolver null (y no
// undefined) permite VACIAR un campo al editar: en PATCH, una clave presente
// con "" limpia el dato; una clave ausente no se toca.
const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

const birthDateSchema = z
  .string()
  .min(1, "La fecha de nacimiento es obligatoria")
  .refine(isValidDateString, "Fecha inválida (usá dd/mm/aaaa)");

// Enum opcional que acepta "" (select vacío) y lo trata como "sin valor".
function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.enum(values).optional(),
  );
}

// ─── Sub-entidades ───────────────────────────────────────────────────────────

export const caregiverSchema = z.object({
  name: z.string().trim().min(1, "El nombre del cuidador es obligatorio").max(120),
  relationship: optionalText(80),
  phone: optionalText(40),
  livesWith: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
  notes: optionalText(500),
});
export type CaregiverInput = z.infer<typeof caregiverSchema>;

export const conditionSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la condición es obligatorio").max(160),
  since: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || isValidDateString(v), "Fecha inválida (dd/mm/aaaa)"),
  active: z.boolean().default(true),
  notes: optionalText(500),
});
export type ConditionInput = z.infer<typeof conditionSchema>;

export const allergySchema = z.object({
  substance: z.string().trim().min(1, "La sustancia es obligatoria").max(160),
  reaction: optionalText(200),
  severity: optionalEnum(ALLERGY_SEVERITY),
  notes: optionalText(500),
});
export type AllergyInput = z.infer<typeof allergySchema>;

// ─── Paciente ────────────────────────────────────────────────────────────────

export const createPatientSchema = z.object({
  // Datos personales
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(120),
  documentId: optionalText(40),
  birthDate: birthDateSchema,
  sex: z.enum(SEX, { errorMap: () => ({ message: "Seleccioná el sexo" }) }),
  maritalStatus: optionalEnum(MARITAL_STATUS),
  photoUrl: optionalText(500),

  // Contacto
  address: optionalText(255),
  phone: optionalText(40),
  phoneAlt: optionalText(40),
  email: z
    .string()
    .trim()
    .email("Correo inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),

  // Emergencia
  emergencyName: optionalText(120),
  emergencyPhone: optionalText(40),
  emergencyRelation: optionalText(80),

  // Seguro
  insuranceProvider: optionalText(120),
  insuranceNumber: optionalText(80),

  // Situación social
  livesWith: optionalText(160),
  dependencyLevel: optionalEnum(DEPENDENCY_LEVEL),
  housingSituation: optionalText(255),

  // Antecedentes
  medicalHistory: optionalText(4000),
  surgicalHistory: optionalText(4000),
  familyHistory: optionalText(4000),
  smoking: optionalEnum(HABIT_STATUS),
  alcohol: optionalEnum(HABIT_STATUS),
  habitsNotes: optionalText(500),
  notes: optionalText(4000),

  // Relaciones (gestión embebida en el formulario)
  caregivers: z.array(caregiverSchema).default([]),
  conditions: z.array(conditionSchema).default([]),
  allergies: z.array(allergySchema).default([]),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

// En edición todos los campos del núcleo son opcionales; las colecciones, si
// vienen, reemplazan a las existentes.
export const updatePatientSchema = createPatientSchema.partial();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

// ─── Tipos de salida (lo que devuelve la API) ────────────────────────────────

export interface Caregiver extends CaregiverInput {
  id: string;
}
export interface Condition {
  id: string;
  name: string;
  since: string | null;
  active: boolean;
  notes?: string;
}
export interface Allergy {
  id: string;
  substance: string;
  reaction?: string;
  severity?: AllergySeverity;
  notes?: string;
}

export interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string | null;
  birthDate: string; // ISO
  sex: Sex;
  phone: string | null;
  allergyCount: number;
}

export interface PatientDetail {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string | null;
  birthDate: string; // ISO
  sex: Sex;
  maritalStatus: MaritalStatus | null;
  photoUrl: string | null;
  address: string | null;
  phone: string | null;
  phoneAlt: string | null;
  email: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  livesWith: string | null;
  dependencyLevel: DependencyLevel | null;
  housingSituation: string | null;
  medicalHistory: string | null;
  surgicalHistory: string | null;
  familyHistory: string | null;
  smoking: HabitStatus | null;
  alcohol: HabitStatus | null;
  habitsNotes: string | null;
  notes: string | null;
  caregivers: Caregiver[];
  conditions: Condition[];
  allergies: Allergy[];
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
