/**
 * Evaluación de lenguaje y cognición con láminas (Fase G).
 *
 * Tres pruebas que usan el material aportado por la doctora:
 *  1. Nominación por confrontación (lámina de 20 objetos): se marca correcto/
 *     incorrecto cada ítem → puntaje /20.
 *  2. Repetición de frases (7 frases adaptadas) → puntaje /7.
 *  3. Descripción de escena (lámina): observación en texto libre.
 *
 * Las respuestas esperadas (qué objeto es cada número) las conoce la
 * profesional al mostrar la lámina; el sistema solo registra el acierto.
 */
import { z } from "zod";
import { isValidDateString } from "./date";

/** Cantidad de objetos en la lámina de nominación. */
export const NAMING_ITEM_COUNT = 20;

/** Frases de la prueba de repetición (verbatim de la ficha de la doctora). */
export const REPETITION_PHRASES: string[] = [
  "Él barre la casa.",
  "Me gustan las mandarinas.",
  "El bombero subió por las escaleras.",
  "Se fue al mercado para comprar los yuyos.",
  "Puse la pava sobre la brasa caliente.",
  "Mi nieta me trajo una guampa de regalo.",
  "El yakaré estaba tomando sol en el río.",
];

/** Rutas de las láminas (servidas desde apps/web/public). */
export const LAMINA_ESCENA = "/laminas/escena.png";
export const LAMINA_NOMINACION = "/laminas/nominacion.png";

/** Normaliza un arreglo de booleanos a una longitud fija (rellena con false). */
export function sanitizeBoolArray(input: unknown, length: number): boolean[] {
  const arr = Array.isArray(input) ? input : [];
  return Array.from({ length }, (_, i) => arr[i] === true);
}

export const cognitionAssessmentSchema = z.object({
  date: z
    .string()
    .min(1, "La fecha es obligatoria")
    .refine(isValidDateString, "Fecha inválida (dd/mm/aaaa)"),
  // Acierto por objeto (longitud NAMING_ITEM_COUNT) y por frase (longitud 7).
  naming: z.array(z.boolean()).default([]),
  phrases: z.array(z.boolean()).default([]),
  descriptionNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});
export type CognitionAssessmentInput = z.infer<typeof cognitionAssessmentSchema>;

export interface CognitionAssessmentItem {
  id: string;
  assessedAt: string; // ISO
  naming: boolean[]; // longitud NAMING_ITEM_COUNT
  phrases: boolean[]; // longitud REPETITION_PHRASES.length
  namingScore: number; // aciertos /20
  phraseScore: number; // aciertos /7
  descriptionNotes: string | null;
  notes: string | null;
}

/** Cuenta los aciertos (valores true) de un arreglo de booleanos. */
export function countCorrect(arr: boolean[]): number {
  return arr.reduce((n, v) => (v ? n + 1 : n), 0);
}
