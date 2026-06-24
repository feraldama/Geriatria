/**
 * Escalas de Valoración Geriátrica Integral (Fase 6).
 *
 * Cada escala se define como un cuestionario con puntaje automático e
 * interpretación. Las definiciones son la fuente de verdad COMPARTIDA: el
 * frontend renderiza el formulario y muestra el puntaje en vivo; el backend
 * RE-CALCULA el puntaje a partir de las respuestas (no confía en el cliente).
 *
 * Aviso: son ayudas de cálculo, no diagnósticos; no sustituyen el criterio
 * clínico de la profesional. Algunas escalas (MMSE, MoCA, Pfeiffer) deben
 * ajustarse según escolaridad.
 */
import { isValidDateString } from "./date";

export const SCALE_TYPES = [
  "BARTHEL",
  "KATZ",
  "LAWTON",
  "MMSE",
  "MOCA",
  "RELOJ",
  "PFEIFFER",
  "YESAVAGE",
  "FRIED",
  "FRAIL",
  "TUG",
  "TINETTI",
  "MNA",
  "CHARLSON",
  "BRADEN",
  "NORTON",
] as const;
export type ScaleType = (typeof SCALE_TYPES)[number];

export type ScaleLevel = "good" | "warning" | "bad";
export interface ScaleInterpretation {
  label: string;
  level: ScaleLevel;
}
const I = (label: string, level: ScaleLevel): ScaleInterpretation => ({ label, level });

export interface ScaleOption {
  label: string;
  value: number;
}

// Pregunta con opciones (radio), rango (puntos por sección) o número (input).
export type ScaleQuestion =
  | { id: string; text: string; kind: "options"; options: ScaleOption[] }
  | { id: string; text: string; kind: "range"; max: number; help?: string }
  | { id: string; text: string; kind: "number"; min: number; max: number; step?: number; unit?: string; help?: string };

export interface ScaleDefinition {
  type: ScaleType;
  name: string;
  category: string;
  description: string;
  maxScore: number;
  /** true: más puntaje = mejor (Barthel, MMSE…). false: más = peor (GDS, Charlson…). */
  betterWhenHigher: boolean;
  questions: ScaleQuestion[];
  interpret: (score: number) => ScaleInterpretation;
}

export type ScaleAnswers = Record<string, number>;

// Opciones reutilizables
const SI_NO_SINO = [
  { label: "Sí", value: 1 },
  { label: "No", value: 0 },
];
const PRESENTE_AUSENTE = [
  { label: "Presente", value: 1 },
  { label: "Ausente", value: 0 },
];

// ─── Índice de Barthel (ABVD) ──────────────────────────────────────────────
const BARTHEL: ScaleDefinition = {
  type: "BARTHEL",
  name: "Índice de Barthel",
  category: "Funcionalidad básica (ABVD)",
  description: "Independencia en las actividades básicas de la vida diaria (0–100).",
  maxScore: 100,
  betterWhenHigher: true,
  questions: [
    { id: "alimentacion", text: "Alimentación", kind: "options", options: [{ label: "Incapaz", value: 0 }, { label: "Necesita ayuda", value: 5 }, { label: "Independiente", value: 10 }] },
    { id: "bano", text: "Baño", kind: "options", options: [{ label: "Dependiente", value: 0 }, { label: "Independiente", value: 5 }] },
    { id: "aseo", text: "Aseo personal", kind: "options", options: [{ label: "Necesita ayuda", value: 0 }, { label: "Independiente", value: 5 }] },
    { id: "vestido", text: "Vestirse", kind: "options", options: [{ label: "Dependiente", value: 0 }, { label: "Necesita ayuda", value: 5 }, { label: "Independiente", value: 10 }] },
    { id: "deposiciones", text: "Deposiciones", kind: "options", options: [{ label: "Incontinente", value: 0 }, { label: "Accidente ocasional", value: 5 }, { label: "Continente", value: 10 }] },
    { id: "miccion", text: "Micción", kind: "options", options: [{ label: "Incontinente", value: 0 }, { label: "Accidente ocasional", value: 5 }, { label: "Continente", value: 10 }] },
    { id: "retrete", text: "Uso del retrete", kind: "options", options: [{ label: "Dependiente", value: 0 }, { label: "Necesita algo de ayuda", value: 5 }, { label: "Independiente", value: 10 }] },
    { id: "traslado", text: "Traslado sillón / cama", kind: "options", options: [{ label: "Incapaz", value: 0 }, { label: "Gran ayuda", value: 5 }, { label: "Mínima ayuda", value: 10 }, { label: "Independiente", value: 15 }] },
    { id: "deambulacion", text: "Deambulación", kind: "options", options: [{ label: "Inmóvil", value: 0 }, { label: "Independiente en silla de ruedas", value: 5 }, { label: "Camina con ayuda", value: 10 }, { label: "Independiente", value: 15 }] },
    { id: "escaleras", text: "Subir y bajar escaleras", kind: "options", options: [{ label: "Incapaz", value: 0 }, { label: "Necesita ayuda", value: 5 }, { label: "Independiente", value: 10 }] },
  ],
  interpret: (s) => {
    if (s >= 100) return I("Independiente", "good");
    if (s >= 60) return I("Dependencia leve", "good");
    if (s >= 40) return I("Dependencia moderada", "warning");
    if (s >= 20) return I("Dependencia grave", "bad");
    return I("Dependencia total", "bad");
  },
};

// ─── Índice de Katz (ABVD) ─────────────────────────────────────────────────
const KATZ: ScaleDefinition = {
  type: "KATZ",
  name: "Índice de Katz",
  category: "Funcionalidad básica (ABVD)",
  description: "Independencia en 6 actividades básicas (0–6).",
  maxScore: 6,
  betterWhenHigher: true,
  questions: [
    { id: "bano", text: "Baño", kind: "options", options: [{ label: "Independiente", value: 1 }, { label: "Dependiente", value: 0 }] },
    { id: "vestido", text: "Vestido", kind: "options", options: [{ label: "Independiente", value: 1 }, { label: "Dependiente", value: 0 }] },
    { id: "retrete", text: "Uso del retrete", kind: "options", options: [{ label: "Independiente", value: 1 }, { label: "Dependiente", value: 0 }] },
    { id: "movilidad", text: "Movilidad / transferencia", kind: "options", options: [{ label: "Independiente", value: 1 }, { label: "Dependiente", value: 0 }] },
    { id: "continencia", text: "Continencia", kind: "options", options: [{ label: "Continente", value: 1 }, { label: "Incontinente", value: 0 }] },
    { id: "alimentacion", text: "Alimentación", kind: "options", options: [{ label: "Independiente", value: 1 }, { label: "Dependiente", value: 0 }] },
  ],
  interpret: (s) => {
    if (s >= 6) return I("Independiente", "good");
    if (s >= 5) return I("Dependencia leve", "good");
    if (s >= 3) return I("Dependencia moderada", "warning");
    return I("Dependencia severa", "bad");
  },
};

// ─── Escala de Lawton-Brody (AIVD) ─────────────────────────────────────────
const LAWTON: ScaleDefinition = {
  type: "LAWTON",
  name: "Escala de Lawton-Brody",
  category: "Funcionalidad instrumental (AIVD)",
  description: "Actividades instrumentales de la vida diaria (0–8).",
  maxScore: 8,
  betterWhenHigher: true,
  questions: [
    { id: "telefono", text: "Capacidad para usar el teléfono", kind: "options", options: [{ label: "Lo usa por iniciativa / marca números / contesta", value: 1 }, { label: "No usa el teléfono", value: 0 }] },
    { id: "compras", text: "Hacer compras", kind: "options", options: [{ label: "Realiza todas las compras de forma independiente", value: 1 }, { label: "Necesita ayuda o es incapaz", value: 0 }] },
    { id: "comida", text: "Preparación de la comida", kind: "options", options: [{ label: "Planea y prepara comidas de forma independiente", value: 1 }, { label: "Necesita que le preparen las comidas", value: 0 }] },
    { id: "casa", text: "Cuidado de la casa", kind: "options", options: [{ label: "Mantiene la casa solo o con ayuda ocasional", value: 1 }, { label: "No participa en labores de la casa", value: 0 }] },
    { id: "ropa", text: "Lavado de la ropa", kind: "options", options: [{ label: "Lava por sí solo / pequeñas prendas", value: 1 }, { label: "Lo realiza otra persona", value: 0 }] },
    { id: "transporte", text: "Uso de medios de transporte", kind: "options", options: [{ label: "Viaja solo o en transporte público", value: 1 }, { label: "Solo viaja acompañado / no viaja", value: 0 }] },
    { id: "medicacion", text: "Responsabilidad sobre su medicación", kind: "options", options: [{ label: "Toma su medicación correctamente", value: 1 }, { label: "Necesita que se la preparen", value: 0 }] },
    { id: "finanzas", text: "Manejo de asuntos económicos", kind: "options", options: [{ label: "Maneja sus finanzas (ayuda solo en banca)", value: 1 }, { label: "Incapaz de manejar dinero", value: 0 }] },
  ],
  interpret: (s) => {
    if (s >= 8) return I("Independiente", "good");
    if (s >= 6) return I("Dependencia ligera", "good");
    if (s >= 4) return I("Dependencia moderada", "warning");
    if (s >= 2) return I("Dependencia severa", "bad");
    return I("Dependencia total", "bad");
  },
};

// ─── Mini-Mental (MMSE) ────────────────────────────────────────────────────
const MMSE: ScaleDefinition = {
  type: "MMSE",
  name: "Mini-Mental (MMSE)",
  category: "Cognición",
  description: "Examen cognitivo breve (0–30). Cargá los puntos por sección. Ajustar por escolaridad.",
  maxScore: 30,
  betterWhenHigher: true,
  questions: [
    { id: "orientacion_temporal", text: "Orientación temporal (año, estación, fecha, día, mes)", kind: "range", max: 5 },
    { id: "orientacion_espacial", text: "Orientación espacial (país, región, ciudad, lugar, planta)", kind: "range", max: 5 },
    { id: "fijacion", text: "Fijación / registro (3 palabras)", kind: "range", max: 3 },
    { id: "atencion_calculo", text: "Atención y cálculo (restar 7 / deletrear MUNDO al revés)", kind: "range", max: 5 },
    { id: "memoria", text: "Memoria diferida (recordar las 3 palabras)", kind: "range", max: 3 },
    { id: "nominacion", text: "Nominación (reloj, lápiz)", kind: "range", max: 2 },
    { id: "repeticion", text: "Repetición de una frase", kind: "range", max: 1 },
    { id: "comprension", text: "Comprensión (orden de 3 etapas)", kind: "range", max: 3 },
    { id: "lectura", text: "Lectura (“cierre los ojos”)", kind: "range", max: 1 },
    { id: "escritura", text: "Escritura de una frase", kind: "range", max: 1 },
    { id: "copia", text: "Copia del dibujo (pentágonos)", kind: "range", max: 1 },
  ],
  interpret: (s) => {
    if (s >= 27) return I("Normal", "good");
    if (s >= 24) return I("Posible deterioro cognitivo", "warning");
    if (s >= 19) return I("Deterioro cognitivo leve", "warning");
    if (s >= 12) return I("Deterioro cognitivo moderado", "bad");
    return I("Deterioro cognitivo grave", "bad");
  },
};

// ─── MoCA ──────────────────────────────────────────────────────────────────
const MOCA: ScaleDefinition = {
  type: "MOCA",
  name: "MoCA (Montreal)",
  category: "Cognición",
  description: "Evaluación cognitiva de Montreal (0–30). Sumar 1 punto si ≤12 años de escolaridad.",
  maxScore: 30,
  betterWhenHigher: true,
  questions: [
    { id: "visuoespacial", text: "Visuoespacial / ejecutiva (alternancia, cubo, reloj)", kind: "range", max: 5 },
    { id: "nominacion", text: "Identificación / nominación (3 animales)", kind: "range", max: 3 },
    { id: "atencion", text: "Atención (dígitos, vigilancia, resta de 7)", kind: "range", max: 6 },
    { id: "lenguaje", text: "Lenguaje (repetición y fluencia)", kind: "range", max: 3 },
    { id: "abstraccion", text: "Abstracción (semejanzas)", kind: "range", max: 2 },
    { id: "recuerdo", text: "Recuerdo diferido (5 palabras)", kind: "range", max: 5 },
    { id: "orientacion", text: "Orientación (fecha, mes, año, día, lugar, ciudad)", kind: "range", max: 6 },
  ],
  interpret: (s) => {
    if (s >= 26) return I("Normal", "good");
    if (s >= 18) return I("Deterioro cognitivo leve", "warning");
    if (s >= 10) return I("Deterioro cognitivo moderado", "bad");
    return I("Deterioro cognitivo grave", "bad");
  },
};

// ─── Test del reloj ────────────────────────────────────────────────────────
const RELOJ: ScaleDefinition = {
  type: "RELOJ",
  name: "Test del reloj",
  category: "Cognición",
  description: "Dibujo del reloj a la orden (0–10). Cargá los puntos por componente.",
  maxScore: 10,
  betterWhenHigher: true,
  questions: [
    { id: "esfera", text: "Esfera del reloj (círculo)", kind: "range", max: 2 },
    { id: "numeros", text: "Presencia y orden de los números", kind: "range", max: 4 },
    { id: "manecillas", text: "Posición y longitud de las manecillas", kind: "range", max: 4 },
  ],
  interpret: (s) => {
    if (s >= 8) return I("Normal", "good");
    if (s >= 6) return I("Alteración leve", "warning");
    return I("Alteración significativa", "bad");
  },
};

// ─── Pfeiffer (SPMSQ) — cuenta ERRORES ─────────────────────────────────────
const PFEIFFER: ScaleDefinition = {
  type: "PFEIFFER",
  name: "Cuestionario de Pfeiffer (SPMSQ)",
  category: "Cognición",
  description: "Cribado cognitivo por errores (0–10). Mayor número de errores = peor. Ajustar por escolaridad.",
  maxScore: 10,
  betterWhenHigher: false,
  questions: [
    { id: "p1", text: "¿Qué día es hoy? (día, mes, año)", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p2", text: "¿Qué día de la semana es?", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p3", text: "¿Cómo se llama este lugar?", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p4", text: "¿Cuál es su número de teléfono o dirección?", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p5", text: "¿Qué edad tiene?", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p6", text: "¿Cuándo nació?", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p7", text: "¿Quién es el presidente actual?", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p8", text: "¿Quién fue el presidente anterior?", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p9", text: "Apellido de su madre", kind: "options", options: PRESENTE_AUSENTE_ERR() },
    { id: "p10", text: "Reste de 3 en 3 desde 20", kind: "options", options: PRESENTE_AUSENTE_ERR() },
  ],
  interpret: (s) => {
    if (s <= 2) return I("Función intelectual intacta", "good");
    if (s <= 4) return I("Deterioro cognitivo leve", "warning");
    if (s <= 7) return I("Deterioro cognitivo moderado", "bad");
    return I("Deterioro cognitivo severo", "bad");
  },
};
function PRESENTE_AUSENTE_ERR(): ScaleOption[] {
  return [
    { label: "Correcto", value: 0 },
    { label: "Error", value: 1 },
  ];
}

// ─── Yesavage (GDS-15) ─────────────────────────────────────────────────────
const NO_1 = [{ label: "Sí", value: 0 }, { label: "No", value: 1 }];
const SI_1 = [{ label: "Sí", value: 1 }, { label: "No", value: 0 }];
const YESAVAGE: ScaleDefinition = {
  type: "YESAVAGE",
  name: "Depresión Geriátrica de Yesavage (GDS-15)",
  category: "Estado de ánimo",
  description: "Cribado de depresión (0–15). Mayor puntaje = mayor sintomatología.",
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
    { id: "q8", text: "¿Se siente a menudo desamparado/a?", kind: "options", options: SI_1 },
    { id: "q9", text: "¿Prefiere quedarse en casa en lugar de salir?", kind: "options", options: SI_1 },
    { id: "q10", text: "¿Cree que tiene más problemas de memoria que la mayoría?", kind: "options", options: SI_1 },
    { id: "q11", text: "¿Piensa que es maravilloso estar vivo/a?", kind: "options", options: NO_1 },
    { id: "q12", text: "¿Se siente inútil o que no vale nada?", kind: "options", options: SI_1 },
    { id: "q13", text: "¿Se siente lleno/a de energía?", kind: "options", options: NO_1 },
    { id: "q14", text: "¿Siente que su situación es desesperada?", kind: "options", options: SI_1 },
    { id: "q15", text: "¿Cree que la mayoría está mejor que usted?", kind: "options", options: SI_1 },
  ],
  interpret: (s) => {
    if (s <= 5) return I("Normal", "good");
    if (s <= 10) return I("Depresión leve a moderada", "warning");
    return I("Depresión establecida (severa)", "bad");
  },
};

// ─── Fragilidad de Fried ───────────────────────────────────────────────────
const FRIED: ScaleDefinition = {
  type: "FRIED",
  name: "Criterios de fragilidad de Fried",
  category: "Fragilidad",
  description: "Fenotipo de fragilidad (0–5). Mayor puntaje = más frágil.",
  maxScore: 5,
  betterWhenHigher: false,
  questions: [
    { id: "peso", text: "Pérdida de peso involuntaria (>4,5 kg en el último año)", kind: "options", options: PRESENTE_AUSENTE },
    { id: "agotamiento", text: "Agotamiento / baja energía (autorreferido)", kind: "options", options: PRESENTE_AUSENTE },
    { id: "debilidad", text: "Debilidad (fuerza de prensión disminuida)", kind: "options", options: PRESENTE_AUSENTE },
    { id: "lentitud", text: "Lentitud de la marcha", kind: "options", options: PRESENTE_AUSENTE },
    { id: "actividad", text: "Baja actividad física", kind: "options", options: PRESENTE_AUSENTE },
  ],
  interpret: (s) => {
    if (s === 0) return I("Robusto (no frágil)", "good");
    if (s <= 2) return I("Prefrágil", "warning");
    return I("Frágil", "bad");
  },
};

// ─── Escala FRAIL ──────────────────────────────────────────────────────────
const FRAIL: ScaleDefinition = {
  type: "FRAIL",
  name: "Escala FRAIL",
  category: "Fragilidad",
  description: "Cribado de fragilidad (0–5). Mayor puntaje = más frágil.",
  maxScore: 5,
  betterWhenHigher: false,
  questions: [
    { id: "fatiga", text: "¿Se siente cansado/a la mayor parte del tiempo?", kind: "options", options: SI_NO_SINO },
    { id: "resistencia", text: "¿Tiene dificultad para subir un piso de escaleras?", kind: "options", options: SI_NO_SINO },
    { id: "deambulacion", text: "¿Tiene dificultad para caminar una cuadra?", kind: "options", options: SI_NO_SINO },
    { id: "enfermedades", text: "¿Tiene más de 5 enfermedades?", kind: "options", options: SI_NO_SINO },
    { id: "peso", text: "¿Ha perdido más del 5% del peso en el último año?", kind: "options", options: SI_NO_SINO },
  ],
  interpret: (s) => {
    if (s === 0) return I("Robusto", "good");
    if (s <= 2) return I("Prefrágil", "warning");
    return I("Frágil", "bad");
  },
};

// ─── Timed Up and Go (TUG) ─────────────────────────────────────────────────
const TUG: ScaleDefinition = {
  type: "TUG",
  name: "Timed Up and Go (TUG)",
  category: "Riesgo de caídas",
  description: "Tiempo en levantarse, caminar 3 m, volver y sentarse (segundos).",
  maxScore: 60,
  betterWhenHigher: false,
  questions: [
    { id: "tiempo", text: "Tiempo en completar la prueba", kind: "number", min: 0, max: 120, step: 1, unit: "segundos" },
  ],
  interpret: (s) => {
    if (s < 14) return I("Bajo riesgo de caídas", "good");
    if (s <= 20) return I("Riesgo aumentado de caídas", "warning");
    return I("Alto riesgo de caídas", "bad");
  },
};

// ─── Tinetti (POMA) ────────────────────────────────────────────────────────
const TINETTI: ScaleDefinition = {
  type: "TINETTI",
  name: "Escala de Tinetti (POMA)",
  category: "Riesgo de caídas",
  description: "Marcha y equilibrio (0–28). Cargá los puntos de cada bloque.",
  maxScore: 28,
  betterWhenHigher: true,
  questions: [
    { id: "equilibrio", text: "Equilibrio (sentado, levantarse, de pie, giro…)", kind: "range", max: 16 },
    { id: "marcha", text: "Marcha (inicio, longitud, simetría, trayectoria…)", kind: "range", max: 12 },
  ],
  interpret: (s) => {
    if (s >= 24) return I("Bajo riesgo de caídas", "good");
    if (s >= 19) return I("Riesgo moderado de caídas", "warning");
    return I("Alto riesgo de caídas", "bad");
  },
};

// ─── Mini Nutritional Assessment (MNA-SF) ──────────────────────────────────
const MNA: ScaleDefinition = {
  type: "MNA",
  name: "Mini Nutritional Assessment (MNA-SF)",
  category: "Nutrición",
  description: "Cribado nutricional, versión corta (0–14).",
  maxScore: 14,
  betterWhenHigher: true,
  questions: [
    { id: "ingesta", text: "Disminución de la ingesta en los últimos 3 meses", kind: "options", options: [{ label: "Grave", value: 0 }, { label: "Moderada", value: 1 }, { label: "Sin disminución", value: 2 }] },
    { id: "peso", text: "Pérdida de peso en los últimos 3 meses", kind: "options", options: [{ label: ">3 kg", value: 0 }, { label: "No sabe", value: 1 }, { label: "1–3 kg", value: 2 }, { label: "Sin pérdida", value: 3 }] },
    { id: "movilidad", text: "Movilidad", kind: "options", options: [{ label: "Cama o sillón", value: 0 }, { label: "Sale de la cama pero no sale", value: 1 }, { label: "Sale del domicilio", value: 2 }] },
    { id: "estres", text: "Enfermedad aguda o estrés psicológico (3 meses)", kind: "options", options: [{ label: "Sí", value: 0 }, { label: "No", value: 2 }] },
    { id: "neuro", text: "Problemas neuropsicológicos", kind: "options", options: [{ label: "Demencia o depresión grave", value: 0 }, { label: "Demencia leve", value: 1 }, { label: "Sin problemas", value: 2 }] },
    { id: "imc", text: "Índice de masa corporal (IMC)", kind: "options", options: [{ label: "< 19", value: 0 }, { label: "19 a <21", value: 1 }, { label: "21 a <23", value: 2 }, { label: "≥ 23", value: 3 }] },
  ],
  interpret: (s) => {
    if (s >= 12) return I("Estado nutricional normal", "good");
    if (s >= 8) return I("Riesgo de malnutrición", "warning");
    return I("Malnutrición", "bad");
  },
};

// ─── Índice de comorbilidad de Charlson ────────────────────────────────────
const ch = (text: string, weight: number, id: string): ScaleQuestion => ({
  id,
  text: `${text} (+${weight})`,
  kind: "options",
  options: [
    { label: "Presente", value: weight },
    { label: "Ausente", value: 0 },
  ],
});
const CHARLSON: ScaleDefinition = {
  type: "CHARLSON",
  name: "Índice de comorbilidad de Charlson",
  category: "Comorbilidad",
  description: "Suma ponderada de comorbilidades (versión no ajustada por edad). Mayor = peor pronóstico.",
  maxScore: 37,
  betterWhenHigher: false,
  questions: [
    ch("Infarto de miocardio", 1, "iam"),
    ch("Insuficiencia cardíaca", 1, "icc"),
    ch("Enfermedad vascular periférica", 1, "evp"),
    ch("Enfermedad cerebrovascular", 1, "acv"),
    ch("Demencia", 1, "demencia"),
    ch("EPOC", 1, "epoc"),
    ch("Enfermedad del tejido conectivo", 1, "conectivo"),
    ch("Úlcera péptica", 1, "ulcera"),
    ch("Hepatopatía leve", 1, "hepato_leve"),
    ch("Diabetes sin complicaciones", 1, "dm"),
    ch("Hemiplejía", 2, "hemiplejia"),
    ch("Enfermedad renal moderada o severa", 2, "renal"),
    ch("Diabetes con lesión de órgano", 2, "dm_organo"),
    ch("Tumor sin metástasis", 2, "tumor"),
    ch("Leucemia", 2, "leucemia"),
    ch("Linfoma", 2, "linfoma"),
    ch("Hepatopatía moderada o severa", 3, "hepato_grave"),
    ch("Tumor sólido metastásico", 6, "metastasis"),
    ch("SIDA", 6, "sida"),
  ],
  interpret: (s) => {
    if (s === 0) return I("Sin comorbilidad significativa", "good");
    if (s <= 2) return I("Comorbilidad baja", "warning");
    if (s <= 4) return I("Comorbilidad moderada", "bad");
    return I("Comorbilidad severa", "bad");
  },
};

// ─── Escala de Braden (úlceras por presión) ────────────────────────────────
const BRADEN: ScaleDefinition = {
  type: "BRADEN",
  name: "Escala de Braden",
  category: "Riesgo de úlceras por presión",
  description: "Riesgo de úlceras por presión (6–23). Menor puntaje = mayor riesgo.",
  maxScore: 23,
  betterWhenHigher: true,
  questions: [
    { id: "sensorial", text: "Percepción sensorial", kind: "options", options: [{ label: "Completamente limitada", value: 1 }, { label: "Muy limitada", value: 2 }, { label: "Ligeramente limitada", value: 3 }, { label: "Sin limitaciones", value: 4 }] },
    { id: "humedad", text: "Exposición a la humedad", kind: "options", options: [{ label: "Constantemente húmeda", value: 1 }, { label: "Muy húmeda", value: 2 }, { label: "Ocasionalmente húmeda", value: 3 }, { label: "Raramente húmeda", value: 4 }] },
    { id: "actividad", text: "Actividad", kind: "options", options: [{ label: "Encamado", value: 1 }, { label: "En silla", value: 2 }, { label: "Camina ocasionalmente", value: 3 }, { label: "Camina frecuentemente", value: 4 }] },
    { id: "movilidad", text: "Movilidad", kind: "options", options: [{ label: "Completamente inmóvil", value: 1 }, { label: "Muy limitada", value: 2 }, { label: "Ligeramente limitada", value: 3 }, { label: "Sin limitaciones", value: 4 }] },
    { id: "nutricion", text: "Nutrición", kind: "options", options: [{ label: "Muy pobre", value: 1 }, { label: "Probablemente inadecuada", value: 2 }, { label: "Adecuada", value: 3 }, { label: "Excelente", value: 4 }] },
    { id: "friccion", text: "Fricción y cizallamiento", kind: "options", options: [{ label: "Problema", value: 1 }, { label: "Problema potencial", value: 2 }, { label: "Sin problema aparente", value: 3 }] },
  ],
  interpret: (s) => {
    if (s >= 19) return I("Riesgo bajo", "good");
    if (s >= 15) return I("Riesgo moderado", "warning");
    return I("Riesgo alto", "bad");
  },
};

// ─── Escala de Norton (úlceras por presión) ────────────────────────────────
const NORTON: ScaleDefinition = {
  type: "NORTON",
  name: "Escala de Norton",
  category: "Riesgo de úlceras por presión",
  description: "Riesgo de úlceras por presión (5–20). Menor puntaje = mayor riesgo.",
  maxScore: 20,
  betterWhenHigher: true,
  questions: [
    { id: "fisico", text: "Estado físico general", kind: "options", options: [{ label: "Muy malo", value: 1 }, { label: "Regular", value: 2 }, { label: "Mediano", value: 3 }, { label: "Bueno", value: 4 }] },
    { id: "mental", text: "Estado mental", kind: "options", options: [{ label: "Estuporoso", value: 1 }, { label: "Confuso", value: 2 }, { label: "Apático", value: 3 }, { label: "Alerta", value: 4 }] },
    { id: "actividad", text: "Actividad", kind: "options", options: [{ label: "Encamado", value: 1 }, { label: "Sentado", value: 2 }, { label: "Camina con ayuda", value: 3 }, { label: "Ambulante", value: 4 }] },
    { id: "movilidad", text: "Movilidad", kind: "options", options: [{ label: "Inmóvil", value: 1 }, { label: "Muy limitada", value: 2 }, { label: "Disminuida", value: 3 }, { label: "Total", value: 4 }] },
    { id: "incontinencia", text: "Incontinencia", kind: "options", options: [{ label: "Doble (urinaria y fecal)", value: 1 }, { label: "Urinaria", value: 2 }, { label: "Ocasional", value: 3 }, { label: "Ninguna", value: 4 }] },
  ],
  interpret: (s) => {
    if (s >= 16) return I("Riesgo bajo", "good");
    if (s >= 12) return I("Riesgo medio", "warning");
    return I("Riesgo alto", "bad");
  },
};

export const SCALE_DEFINITIONS: Record<ScaleType, ScaleDefinition> = {
  BARTHEL,
  KATZ,
  LAWTON,
  MMSE,
  MOCA,
  RELOJ,
  PFEIFFER,
  YESAVAGE,
  FRIED,
  FRAIL,
  TUG,
  TINETTI,
  MNA,
  CHARLSON,
  BRADEN,
  NORTON,
};

/** Categorías en orden de presentación. */
export const SCALE_CATEGORIES: string[] = (() => {
  const seen: string[] = [];
  for (const t of SCALE_TYPES) {
    const c = SCALE_DEFINITIONS[t].category;
    if (!seen.includes(c)) seen.push(c);
  }
  return seen;
})();

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
      if (!q.options.some((o) => o.value === value)) throw new Error(`Respuesta inválida en "${q.text}"`);
    } else if (q.kind === "range") {
      if (value < 0 || value > q.max) throw new Error(`Valor fuera de rango en "${q.text}"`);
    } else {
      if (value < q.min || value > q.max) throw new Error(`Valor fuera de rango en "${q.text}"`);
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

export function isValidScaleDate(input: string): boolean {
  return isValidDateString(input);
}
