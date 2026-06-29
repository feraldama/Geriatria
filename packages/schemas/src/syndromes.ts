/**
 * Síndromes geriátricos (Fase D). Checklist de presencia/ausencia que se
 * registra con fecha para poder seguir su evolución a lo largo del tiempo.
 *
 * Cada evaluación es una foto fechada: guarda la lista de síndromes presentes
 * ese día. La evaluación más reciente representa el estado actual del paciente.
 */
import { z } from "zod";
import { isValidDateString } from "./date";

/** Los 18 síndromes de la ficha de la doctora, en su orden. */
export const GERIATRIC_SYNDROMES = [
  { key: "deterioro_cognitivo", label: "Deterioro cognitivo / demencia" },
  { key: "delirium", label: "Delirium" },
  { key: "depresion_ansiedad", label: "Depresión / ansiedad" },
  { key: "trastorno_sueno", label: "Trastorno del sueño" },
  { key: "inmovilidad", label: "Inmovilidad" },
  { key: "inestabilidad_caidas", label: "Inestabilidad y caídas" },
  { key: "sarcopenia_dinapenia", label: "Sarcopenia y dinapenia" },
  { key: "lesiones_dependencia", label: "Lesiones asociadas a la dependencia" },
  { key: "incontinencia", label: "Incontinencia urinaria / fecal" },
  { key: "estrenimiento", label: "Estreñimiento / impactación fecal" },
  { key: "malnutricion_deshidratacion", label: "Malnutrición / deshidratación" },
  { key: "deficit_sensorial", label: "Déficit sensorial" },
  { key: "fragilidad", label: "Fragilidad" },
  { key: "polifarmacia", label: "Polifarmacia" },
  { key: "dolor_cronico", label: "Dolor crónico" },
  { key: "aislamiento_social", label: "Aislamiento social o soledad no deseada" },
  { key: "declive_funcional", label: "Declive funcional o dependencia" },
  { key: "disfagia", label: "Disfagia" },
] as const;

export type SyndromeKey = (typeof GERIATRIC_SYNDROMES)[number]["key"];

export const SYNDROME_KEYS: SyndromeKey[] = GERIATRIC_SYNDROMES.map((s) => s.key);

/** Etiqueta legible de una clave de síndrome. */
export function syndromeLabel(key: string): string {
  return GERIATRIC_SYNDROMES.find((s) => s.key === key)?.label ?? key;
}

/** Conserva solo las claves de síndrome válidas y sin duplicados. */
export function sanitizeSyndromeKeys(input: unknown): SyndromeKey[] {
  if (!Array.isArray(input)) return [];
  const valid = new Set<string>(SYNDROME_KEYS);
  const seen = new Set<string>();
  const out: SyndromeKey[] = [];
  for (const v of input) {
    if (typeof v === "string" && valid.has(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v as SyndromeKey);
    }
  }
  return out;
}

export const syndromeAssessmentSchema = z.object({
  date: z
    .string()
    .min(1, "La fecha es obligatoria")
    .refine(isValidDateString, "Fecha inválida (dd/mm/aaaa)"),
  // Claves de los síndromes marcados como presentes ese día.
  present: z.array(z.string()).default([]),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});
export type SyndromeAssessmentInput = z.infer<typeof syndromeAssessmentSchema>;

export interface SyndromeAssessmentItem {
  id: string;
  assessedAt: string; // ISO
  present: SyndromeKey[];
  notes: string | null;
}
