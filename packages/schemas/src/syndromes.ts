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

/**
 * Escala de Deterioro Global (GDS-FAST, Reisberg). Estadiaje del deterioro
 * cognitivo global en 7 estadios. Se registra dentro de la evaluación de
 * síndromes geriátricos (estadia el síndrome de deterioro cognitivo/demencia).
 * Es una selección única del estadio 1–7, no una suma de puntos.
 */
export interface GdsStage {
  stage: number; // 1..7
  title: string; // nombre del estadio
  phase: string; // fase clínica
  mec: string; // rango orientativo del MEC (Mini Examen Cognoscitivo)
  summary: string; // características FAST resumidas
}

export const GDS_FAST_STAGES: GdsStage[] = [
  {
    stage: 1,
    title: "Ausencia de déficit cognitivo",
    phase: "Normal",
    mec: "30–35",
    summary: "Ausencia de déficit funcionales objetivos o subjetivos.",
  },
  {
    stage: 2,
    title: "Déficit cognitivo muy leve",
    phase: "Normal para su edad · olvido",
    mec: "25–30",
    summary:
      "Déficit funcional subjetivo: quejas de olvido de nombres o ubicación de objetos, sin objetivarse en el examen.",
  },
  {
    stage: 3,
    title: "Déficit cognitivo leve",
    phase: "Deterioro límite",
    mec: "20–27",
    summary:
      "Déficit en tareas ocupacionales y sociales complejas que empiezan a observar familiares y amigos.",
  },
  {
    stage: 4,
    title: "Déficit cognitivo moderado",
    phase: "Enfermedad de Alzheimer leve",
    mec: "16–23",
    summary:
      "Déficits en tareas complejas: manejo de finanzas, planificación de viajes o comidas; dificultad en la resta seriada.",
  },
  {
    stage: 5,
    title: "Déficit cognitivo moderadamente grave",
    phase: "Enfermedad de Alzheimer moderada",
    mec: "10–19",
    summary:
      "Necesita asistencia para elegir la ropa; olvida datos importantes de su vida cotidiana; cierta desorientación temporoespacial.",
  },
  {
    stage: 6,
    title: "Déficit cognitivo grave",
    phase: "Enfermedad de Alzheimer moderadamente grave",
    mec: "0–12",
    summary:
      "Necesita ayuda para vestirse, bañarse y asearse; puede aparecer incontinencia; cambios de personalidad y afectividad.",
  },
  {
    stage: 7,
    title: "Déficit cognitivo muy grave",
    phase: "Enfermedad de Alzheimer grave",
    mec: "0",
    summary:
      "Pérdida progresiva del habla y de la capacidad motora (deambulación); incontinencia; asistencia total.",
  },
];

/** Etiqueta corta de un estadio GDS (para tablas y resúmenes). */
export function gdsStageLabel(stage: number | null | undefined): string | null {
  if (stage == null) return null;
  const s = GDS_FAST_STAGES.find((g) => g.stage === stage);
  return s ? `GDS ${s.stage} · ${s.title}` : `GDS ${stage}`;
}

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
  // Estadio GDS-FAST (1–7), opcional. null = sin estadiar.
  gdsStage: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(1).max(7).nullable(),
  ),
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
  gdsStage: number | null;
  notes: string | null;
}
