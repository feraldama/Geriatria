/**
 * Escalas de Valoración Geriátrica Integral (Fase 6).
 *
 * Cada escala se define como un cuestionario con puntaje automático e
 * interpretación. Las definiciones son la fuente de verdad COMPARTIDA: el
 * frontend renderiza el formulario y muestra el puntaje en vivo; el backend
 * RE-CALCULA el puntaje a partir de las respuestas (no confía en el cliente).
 *
 * Fase 6 inicial: Barthel, Lawton-Brody, Mini-Mental (MMSE) y Yesavage (GDS-15).
 *
 * Aviso: son ayudas de cálculo, no diagnósticos; no sustituyen el criterio
 * clínico de la profesional.
 */
import { isValidDateString } from "./date";

export const SCALE_TYPES = ["BARTHEL", "LAWTON", "MMSE", "YESAVAGE"] as const;
export type ScaleType = (typeof SCALE_TYPES)[number];

export interface ScaleOption {
  label: string;
  value: number;
}

// Pregunta con opciones (radio) o con rango numérico (puntos por sección).
export type ScaleQuestion =
  | { id: string; text: string; kind: "options"; options: ScaleOption[] }
  | { id: string; text: string; kind: "range"; max: number; help?: string };

export interface ScaleDefinition {
  type: ScaleType;
  name: string;
  category: string;
  description: string;
  maxScore: number;
  /** true: más puntaje = mejor (Barthel, Lawton, MMSE). false: más = peor (GDS). */
  betterWhenHigher: boolean;
  questions: ScaleQuestion[];
  /** Interpretación clínica del puntaje total. */
  interpret: (score: number) => string;
}

export type ScaleAnswers = Record<string, number>;

// ─── Índice de Barthel (ABVD) ──────────────────────────────────────────────
const BARTHEL: ScaleDefinition = {
  type: "BARTHEL",
  name: "Índice de Barthel",
  category: "Funcionalidad básica (ABVD)",
  description: "Mide la independencia en las actividades básicas de la vida diaria (0–100).",
  maxScore: 100,
  betterWhenHigher: true,
  questions: [
    {
      id: "alimentacion",
      text: "Alimentación",
      kind: "options",
      options: [
        { label: "Incapaz", value: 0 },
        { label: "Necesita ayuda (cortar, untar…)", value: 5 },
        { label: "Independiente", value: 10 },
      ],
    },
    {
      id: "bano",
      text: "Baño",
      kind: "options",
      options: [
        { label: "Dependiente", value: 0 },
        { label: "Independiente", value: 5 },
      ],
    },
    {
      id: "aseo",
      text: "Aseo personal",
      kind: "options",
      options: [
        { label: "Necesita ayuda", value: 0 },
        { label: "Independiente (cara, pelo, dientes)", value: 5 },
      ],
    },
    {
      id: "vestido",
      text: "Vestirse",
      kind: "options",
      options: [
        { label: "Dependiente", value: 0 },
        { label: "Necesita ayuda", value: 5 },
        { label: "Independiente", value: 10 },
      ],
    },
    {
      id: "deposiciones",
      text: "Deposiciones",
      kind: "options",
      options: [
        { label: "Incontinente", value: 0 },
        { label: "Accidente ocasional", value: 5 },
        { label: "Continente", value: 10 },
      ],
    },
    {
      id: "miccion",
      text: "Micción",
      kind: "options",
      options: [
        { label: "Incontinente", value: 0 },
        { label: "Accidente ocasional", value: 5 },
        { label: "Continente", value: 10 },
      ],
    },
    {
      id: "retrete",
      text: "Uso del retrete",
      kind: "options",
      options: [
        { label: "Dependiente", value: 0 },
        { label: "Necesita algo de ayuda", value: 5 },
        { label: "Independiente", value: 10 },
      ],
    },
    {
      id: "traslado",
      text: "Traslado sillón / cama",
      kind: "options",
      options: [
        { label: "Incapaz, no se mantiene sentado", value: 0 },
        { label: "Gran ayuda (una o dos personas)", value: 5 },
        { label: "Mínima ayuda", value: 10 },
        { label: "Independiente", value: 15 },
      ],
    },
    {
      id: "deambulacion",
      text: "Deambulación",
      kind: "options",
      options: [
        { label: "Inmóvil", value: 0 },
        { label: "Independiente en silla de ruedas", value: 5 },
        { label: "Camina con ayuda de una persona", value: 10 },
        { label: "Independiente", value: 15 },
      ],
    },
    {
      id: "escaleras",
      text: "Subir y bajar escaleras",
      kind: "options",
      options: [
        { label: "Incapaz", value: 0 },
        { label: "Necesita ayuda", value: 5 },
        { label: "Independiente", value: 10 },
      ],
    },
  ],
  interpret: (s) => {
    if (s >= 100) return "Independiente";
    if (s >= 60) return "Dependencia leve";
    if (s >= 40) return "Dependencia moderada";
    if (s >= 20) return "Dependencia grave";
    return "Dependencia total";
  },
};

// ─── Escala de Lawton-Brody (AIVD) ─────────────────────────────────────────
const LAWTON: ScaleDefinition = {
  type: "LAWTON",
  name: "Escala de Lawton-Brody",
  category: "Funcionalidad instrumental (AIVD)",
  description: "Actividades instrumentales de la vida diaria (0–8; versión de 8 ítems).",
  maxScore: 8,
  betterWhenHigher: true,
  questions: [
    {
      id: "telefono",
      text: "Capacidad para usar el teléfono",
      kind: "options",
      options: [
        { label: "Lo usa por iniciativa propia / marca algunos números / contesta", value: 1 },
        { label: "No usa el teléfono en absoluto", value: 0 },
      ],
    },
    {
      id: "compras",
      text: "Hacer compras",
      kind: "options",
      options: [
        { label: "Realiza todas las compras necesarias de forma independiente", value: 1 },
        { label: "Compra pequeñas cosas / necesita compañía / incapaz", value: 0 },
      ],
    },
    {
      id: "comida",
      text: "Preparación de la comida",
      kind: "options",
      options: [
        { label: "Planea, prepara y sirve comidas adecuadas de forma independiente", value: 1 },
        { label: "Necesita que le preparen o sirvan las comidas", value: 0 },
      ],
    },
    {
      id: "casa",
      text: "Cuidado de la casa",
      kind: "options",
      options: [
        { label: "Mantiene la casa solo o con ayuda ocasional (tareas pesadas)", value: 1 },
        { label: "No participa en ninguna labor de la casa", value: 0 },
      ],
    },
    {
      id: "ropa",
      text: "Lavado de la ropa",
      kind: "options",
      options: [
        { label: "Lava por sí solo / lava pequeñas prendas", value: 1 },
        { label: "Todo el lavado lo realiza otra persona", value: 0 },
      ],
    },
    {
      id: "transporte",
      text: "Uso de medios de transporte",
      kind: "options",
      options: [
        { label: "Viaja solo o usa transporte público / taxi", value: 1 },
        { label: "Solo viaja con ayuda de otro / no viaja", value: 0 },
      ],
    },
    {
      id: "medicacion",
      text: "Responsabilidad respecto a su medicación",
      kind: "options",
      options: [
        { label: "Es capaz de tomar su medicación a la hora y dosis correcta", value: 1 },
        { label: "Necesita que se la preparen o administren", value: 0 },
      ],
    },
    {
      id: "finanzas",
      text: "Manejo de asuntos económicos",
      kind: "options",
      options: [
        { label: "Maneja sus asuntos financieros (con ayuda solo en banca)", value: 1 },
        { label: "Incapaz de manejar dinero", value: 0 },
      ],
    },
  ],
  interpret: (s) => {
    if (s >= 8) return "Independiente";
    if (s >= 6) return "Dependencia ligera";
    if (s >= 4) return "Dependencia moderada";
    if (s >= 2) return "Dependencia severa";
    return "Dependencia total";
  },
};

// ─── Mini-Mental (MMSE) ────────────────────────────────────────────────────
const MMSE: ScaleDefinition = {
  type: "MMSE",
  name: "Mini-Mental (MMSE)",
  category: "Cognición",
  description:
    "Examen cognitivo breve (0–30). Cargá los puntos obtenidos en cada sección. Ajustar según escolaridad.",
  maxScore: 30,
  betterWhenHigher: true,
  questions: [
    { id: "orientacion_temporal", text: "Orientación temporal (año, estación, fecha, día, mes)", kind: "range", max: 5 },
    { id: "orientacion_espacial", text: "Orientación espacial (país, región, ciudad, lugar, planta)", kind: "range", max: 5 },
    { id: "fijacion", text: "Fijación / registro (repetir 3 palabras)", kind: "range", max: 3 },
    { id: "atencion_calculo", text: "Atención y cálculo (restar 7 desde 100, o deletrear MUNDO al revés)", kind: "range", max: 5 },
    { id: "memoria", text: "Memoria diferida (recordar las 3 palabras)", kind: "range", max: 3 },
    { id: "nominacion", text: "Nominación (reloj, lápiz)", kind: "range", max: 2 },
    { id: "repeticion", text: "Repetición de una frase", kind: "range", max: 1 },
    { id: "comprension", text: "Comprensión (orden de 3 etapas)", kind: "range", max: 3 },
    { id: "lectura", text: "Lectura (“cierre los ojos”)", kind: "range", max: 1 },
    { id: "escritura", text: "Escritura de una frase", kind: "range", max: 1 },
    { id: "copia", text: "Copia del dibujo (pentágonos)", kind: "range", max: 1 },
  ],
  interpret: (s) => {
    if (s >= 27) return "Normal";
    if (s >= 24) return "Posible deterioro cognitivo";
    if (s >= 19) return "Deterioro cognitivo leve";
    if (s >= 12) return "Deterioro cognitivo moderado";
    return "Deterioro cognitivo grave";
  },
};

// ─── Escala de Depresión Geriátrica de Yesavage (GDS-15) ───────────────────
// Cada respuesta "depresiva" suma 1 punto.
const SI_1 = [
  { label: "Sí", value: 1 },
  { label: "No", value: 0 },
];
const NO_1 = [
  { label: "Sí", value: 0 },
  { label: "No", value: 1 },
];
const YESAVAGE: ScaleDefinition = {
  type: "YESAVAGE",
  name: "Depresión Geriátrica de Yesavage (GDS-15)",
  category: "Estado de ánimo",
  description: "Cribado de depresión en el adulto mayor (0–15). Mayor puntaje = mayor sintomatología.",
  maxScore: 15,
  betterWhenHigher: false,
  questions: [
    { id: "q1", text: "¿Está básicamente satisfecho con su vida?", kind: "options", options: NO_1 },
    { id: "q2", text: "¿Ha renunciado a muchas de sus actividades e intereses?", kind: "options", options: SI_1 },
    { id: "q3", text: "¿Siente que su vida está vacía?", kind: "options", options: SI_1 },
    { id: "q4", text: "¿Se encuentra a menudo aburrido/a?", kind: "options", options: SI_1 },
    { id: "q5", text: "¿Tiene buen ánimo la mayor parte del tiempo?", kind: "options", options: NO_1 },
    { id: "q6", text: "¿Teme que algo malo le pueda ocurrir?", kind: "options", options: SI_1 },
    { id: "q7", text: "¿Se siente feliz la mayor parte del tiempo?", kind: "options", options: NO_1 },
    { id: "q8", text: "¿Se siente a menudo desamparado/a o abandonado/a?", kind: "options", options: SI_1 },
    { id: "q9", text: "¿Prefiere quedarse en casa en lugar de salir y hacer cosas nuevas?", kind: "options", options: SI_1 },
    { id: "q10", text: "¿Cree que tiene más problemas de memoria que la mayoría?", kind: "options", options: SI_1 },
    { id: "q11", text: "¿Piensa que es maravilloso estar vivo/a?", kind: "options", options: NO_1 },
    { id: "q12", text: "¿Se siente inútil o que no vale nada?", kind: "options", options: SI_1 },
    { id: "q13", text: "¿Se siente lleno/a de energía?", kind: "options", options: NO_1 },
    { id: "q14", text: "¿Siente que su situación es desesperada?", kind: "options", options: SI_1 },
    { id: "q15", text: "¿Cree que la mayoría de la gente está mejor que usted?", kind: "options", options: SI_1 },
  ],
  interpret: (s) => {
    if (s <= 5) return "Normal";
    if (s <= 10) return "Depresión leve a moderada";
    return "Depresión establecida (severa)";
  },
};

export const SCALE_DEFINITIONS: Record<ScaleType, ScaleDefinition> = {
  BARTHEL,
  LAWTON,
  MMSE,
  YESAVAGE,
};

export function getScaleDefinition(type: string): ScaleDefinition | null {
  return (SCALE_DEFINITIONS as Record<string, ScaleDefinition>)[type] ?? null;
}

/**
 * Calcula el puntaje total a partir de las respuestas, validando contra la
 * definición. Lanza si una respuesta es inválida o falta.
 */
export function computeScaleScore(def: ScaleDefinition, answers: ScaleAnswers): number {
  let total = 0;
  for (const q of def.questions) {
    const raw = answers[q.id];
    if (raw === undefined || raw === null || Number.isNaN(Number(raw))) {
      throw new Error(`Falta la respuesta de "${q.text}"`);
    }
    const value = Number(raw);
    if (q.kind === "options") {
      const valid = q.options.some((o) => o.value === value);
      if (!valid) throw new Error(`Respuesta inválida en "${q.text}"`);
    } else {
      if (value < 0 || value > q.max) throw new Error(`Valor fuera de rango en "${q.text}"`);
    }
    total += value;
  }
  return total;
}

// ─── Tipos de salida ────────────────────────────────────────────────────────

export interface AssessmentScaleItem {
  id: string;
  type: ScaleType;
  score: number;
  maxScore: number;
  appliedAt: string; // ISO
  interpretation: string | null;
  notes: string | null;
  answers?: ScaleAnswers; // solo en el detalle
}

// Validación de la fecha de aplicación (dd/mm/aaaa) para el endpoint.
export function isValidScaleDate(input: string): boolean {
  return isValidDateString(input);
}
