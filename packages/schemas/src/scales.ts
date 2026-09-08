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
import type { Sex, EducationLevel } from "./patient";

// Orden de presentación agrupado por las 4 esferas de la Valoración Geriátrica
// Integral (funcional, cognitiva, clínica, social), según la ficha de la doctora.
export const SCALE_TYPES = [
  // Funcionalidad
  "BARTHEL",
  "KATZ",
  "LAWTON",
  "FRAIL",
  "FRIED",
  "TUG",
  "TINETTI",
  "BRADEN",
  "NORTON",
  // Cognición
  "MMSE",
  "MOCA",
  "RELOJ",
  "PFEIFFER",
  "CAM",
  "TAM",
  // Clínico
  "CHARLSON",
  "MNA",
  // Social
  "GIJON",
  "APGAR",
  "ZARIT",
  "YESAVAGE",
] as const;
export type ScaleType = (typeof SCALE_TYPES)[number];

// Las 4 esferas de la VGI, en orden de presentación.
export const SCALE_SPHERES = ["Funcionalidad", "Cognición", "Clínico", "Social"] as const;
export type ScaleSphere = (typeof SCALE_SPHERES)[number];

export type ScaleLevel = "good" | "warning" | "bad";
export interface ScaleInterpretation {
  label: string;
  level: ScaleLevel;
}
const I = (label: string, level: ScaleLevel): ScaleInterpretation => ({ label, level });

/**
 * Contexto del paciente que algunas escalas necesitan para puntuar/interpretar.
 * Por ahora solo el sexo (escala de Lawton: los hombres no puntúan 3 ítems y
 * los puntos de corte difieren por sexo). Extensible a escolaridad, edad, etc.
 */
export interface ScaleContext {
  sex?: Sex;
  /** Nivel de escolaridad del paciente (ajuste de MoCA/Pfeiffer). */
  education?: EducationLevel | null;
  /** Años de estudio; si están, priman sobre el nivel para el ajuste. */
  educationYears?: number | null;
}

/**
 * Franja de escolaridad para ajustar la interpretación de escalas cognitivas.
 * Prioriza los años de estudio; si no hay, usa el nivel. Devuelve null cuando
 * no hay dato (no se aplica ningún ajuste).
 */
export type EducationBand = "low" | "mid" | "high";
export function educationBand(ctx?: ScaleContext): EducationBand | null {
  const y = ctx?.educationYears;
  if (y != null) {
    if (y <= 6) return "low"; // primaria o menos
    if (y >= 13) return "high"; // estudios superiores
    return "mid";
  }
  switch (ctx?.education) {
    case "NINGUNA":
    case "PRIMARIA":
      return "low";
    case "SECUNDARIA":
      return "mid";
    case "TERCIARIA":
    case "UNIVERSITARIA":
      return "high";
    default:
      return null; // sin dato de escolaridad
  }
}

/** Puntos que dependen del sexo: columna M (femenino) y H (masculino). */
export interface PerSexValue {
  M: number;
  H: number;
}

/** Columna de puntaje según sexo. OTRO/desconocido → M (versión completa). */
function sexColumn(sex?: Sex): "M" | "H" {
  return sex === "MASCULINO" ? "H" : "M";
}

export interface ScaleOption {
  label: string;
  /** Número fijo, o puntos dependientes del sexo (Lawton). */
  value: number | PerSexValue;
}

/** Resuelve los puntos de una opción según el sexo del paciente. */
export function optionPoints(opt: ScaleOption, sex?: Sex): number {
  return typeof opt.value === "number" ? opt.value : opt.value[sexColumn(sex)];
}

/** Campos comunes a toda pregunta, sea cual sea su tipo. */
interface ScaleQuestionBase {
  id: string;
  text: string;
  /**
   * Subgrupo dentro de la escala (p. ej. "Memoria inmediata" en la T@M). Las
   * preguntas consecutivas con la misma sección se agrupan bajo un encabezado
   * con su subtotal. Sin sección, la escala se muestra como lista plana.
   */
  section?: string;
  /** Aclaración de administración, verbatim de la lámina cuando existe. */
  help?: string;
}

// Pregunta con opciones (radio), rango (puntos por sección) o número (input).
export type ScaleQuestion =
  | (ScaleQuestionBase & { kind: "options"; options: ScaleOption[] })
  | (ScaleQuestionBase & { kind: "range"; max: number })
  | (ScaleQuestionBase & {
      kind: "number";
      min: number;
      max: number;
      step?: number;
      unit?: string;
    });

/** Lámina que se le muestra al paciente mientras se administra la escala. */
export interface ScaleStimulus {
  /** Ruta servida desde apps/web/public. */
  src: string;
  alt: string;
  caption?: string;
  /**
   * Id de la pregunta antes de la cual se muestra la lámina, para que aparezca
   * en el momento en que se usa y no al principio del formulario. Si no está
   * (o si el id no existe), se muestra arriba de todo.
   */
  beforeQuestion?: string;
}

export interface ScaleDefinition {
  type: ScaleType;
  name: string;
  /** Esfera de la VGI a la que pertenece (nivel superior de agrupación). */
  sphere: ScaleSphere;
  /** Subgrupo dentro de la esfera (p. ej. "Riesgo de caídas"). */
  category: string;
  description: string;
  maxScore: number;
  /**
   * Máximo dependiente del sexo cuando aplica (Lawton: M=8, H=5). Si está
   * presente, prima sobre `maxScore`, que actúa como valor por defecto.
   */
  maxScoreBySex?: PerSexValue;
  /** true: más puntaje = mejor (Barthel, MMSE…). false: más = peor (GDS, Charlson…). */
  betterWhenHigher: boolean;
  /**
   * Si es true, la escala no se ofrece en el listado (se conserva la definición
   * para no romper registros históricos). Usado para retirar escalas de la vista
   * sin perder datos ya cargados.
   */
  hidden?: boolean;
  /**
   * Lámina de estímulos a mostrar durante la administración (MMSE: pentágonos
   * entrelazados + "CIERRE LOS OJOS").
   */
  stimulus?: ScaleStimulus;
  questions: ScaleQuestion[];
  /**
   * Puntaje NO aditivo (algoritmos como CAM, cuyo resultado depende del patrón
   * de respuestas y no de una suma). Si está presente, reemplaza a la suma de
   * puntos. Recibe las respuestas (índices para "options", puntos para el resto).
   */
  computeScore?: (answers: ScaleAnswers, ctx?: ScaleContext) => number;
  /** El contexto (sexo) solo lo usan las escalas que lo necesitan. */
  interpret: (score: number, ctx?: ScaleContext) => ScaleInterpretation;
}

/** Máximo de la escala resuelto según el sexo del paciente. */
export function scaleMaxScore(def: ScaleDefinition, sex?: Sex): number {
  return def.maxScoreBySex ? def.maxScoreBySex[sexColumn(sex)] : def.maxScore;
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
/** Ítem de acierto/error (1/0), como las columnas "0 1" de las láminas. */
const CORRECTO_INCORRECTO = [
  { label: "Correcto", value: 1 },
  { label: "Incorrecto", value: 0 },
];

// ─── Índice de Barthel (ABVD) ──────────────────────────────────────────────
const BARTHEL: ScaleDefinition = {
  type: "BARTHEL",
  name: "Índice de Barthel",
  sphere: "Funcionalidad",
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
  sphere: "Funcionalidad",
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
// Puntos dependientes del sexo: ítem que solo puntúa en mujeres (M=1, H=0).
const SOLO_MUJER: PerSexValue = { M: 1, H: 0 };
const NO_PUNTUA: PerSexValue = { M: 0, H: 0 };

const LAWTON: ScaleDefinition = {
  type: "LAWTON",
  name: "Escala de Lawton-Brody",
  sphere: "Funcionalidad",
  category: "Funcionalidad instrumental (AIVD)",
  description:
    "Actividades instrumentales de la vida diaria. El puntaje y la interpretación dependen del sexo: máximo 8 en mujeres y 5 en hombres (no se puntúan preparación de comida, cuidado de la casa ni lavado de ropa).",
  maxScore: 8,
  maxScoreBySex: { M: 8, H: 5 },
  betterWhenHigher: true,
  questions: [
    {
      id: "telefono",
      text: "Capacidad para usar el teléfono",
      kind: "options",
      options: [
        { label: "Utiliza el teléfono por iniciativa propia", value: 1 },
        { label: "Es capaz de marcar bien algunos números familiares", value: 1 },
        { label: "Es capaz de contestar el teléfono, pero no de marcar", value: 1 },
        { label: "No utiliza el teléfono", value: 0 },
      ],
    },
    {
      id: "compras",
      text: "Hacer compras",
      kind: "options",
      options: [
        { label: "Realiza todas las compras necesarias independientemente", value: 1 },
        { label: "Realiza independientemente pequeñas compras", value: 0 },
        { label: "Necesita ir acompañado para realizar cualquier compra", value: 0 },
        { label: "Totalmente incapaz de comprar", value: 0 },
      ],
    },
    {
      id: "comida",
      text: "Preparación de la comida",
      kind: "options",
      options: [
        { label: "Organiza, prepara y sirve las comidas por sí solo adecuadamente", value: SOLO_MUJER },
        { label: "Prepara adecuadamente las comidas si se le proporcionan los ingredientes", value: NO_PUNTUA },
        { label: "Prepara, calienta y sirve las comidas, pero no sigue una dieta adecuada", value: NO_PUNTUA },
        { label: "Necesita que le preparen y sirvan las comidas", value: NO_PUNTUA },
      ],
    },
    {
      id: "casa",
      text: "Cuidado de la casa",
      kind: "options",
      options: [
        { label: "Mantiene la casa solo o con ayuda ocasional (trabajos pesados)", value: SOLO_MUJER },
        { label: "Realiza tareas ligeras, como lavar los platos o hacer las camas", value: SOLO_MUJER },
        { label: "Realiza tareas ligeras, pero no mantiene un adecuado nivel de limpieza", value: SOLO_MUJER },
        { label: "Necesita ayuda en todas las labores de la casa", value: SOLO_MUJER },
        { label: "No participa en ninguna labor de la casa", value: NO_PUNTUA },
      ],
    },
    {
      id: "ropa",
      text: "Lavado de la ropa",
      kind: "options",
      options: [
        { label: "Lava por sí solo toda su ropa", value: SOLO_MUJER },
        { label: "Lava por sí solo pequeñas prendas", value: SOLO_MUJER },
        { label: "Todo el lavado de ropa debe ser realizado por otro", value: NO_PUNTUA },
      ],
    },
    {
      id: "transporte",
      text: "Uso de medios de transporte",
      kind: "options",
      options: [
        { label: "Viaja solo en transporte público o conduce su propio coche", value: 1 },
        { label: "Es capaz de coger un taxi, pero no usa otro medio de transporte", value: 1 },
        { label: "Viaja en transporte público cuando va acompañado por otra persona", value: 1 },
        { label: "Utiliza el taxi o el automóvil solo con ayuda de otros", value: 0 },
        { label: "No viaja en absoluto", value: 0 },
      ],
    },
    {
      id: "medicacion",
      text: "Responsabilidad respecto a su medicación",
      kind: "options",
      options: [
        { label: "Es capaz de tomar su medicación a la hora y dosis correcta", value: 1 },
        { label: "Toma su medicación si la dosis es preparada previamente", value: 0 },
        { label: "No es capaz de administrarse su medicación", value: 0 },
      ],
    },
    {
      id: "finanzas",
      text: "Manejo de sus asuntos económicos",
      kind: "options",
      options: [
        { label: "Se encarga de sus asuntos económicos por sí solo", value: 1 },
        { label: "Realiza las compras de cada día, pero necesita ayuda en las grandes compras y bancos", value: 1 },
        { label: "Incapaz de manejar dinero", value: 0 },
      ],
    },
  ],
  // Puntos de corte distintos por sexo (lámina oficial Lawton-Brody).
  interpret: (s, ctx) => {
    if (ctx?.sex === "MASCULINO") {
      if (s >= 5) return I("Autónomo", "good");
      if (s === 4) return I("Dependencia ligera", "good");
      if (s >= 2) return I("Dependencia moderada", "warning");
      if (s === 1) return I("Dependencia grave", "bad");
      return I("Dependencia total", "bad");
    }
    if (s >= 8) return I("Autónoma", "good");
    if (s >= 6) return I("Dependencia ligera", "good");
    if (s >= 4) return I("Dependencia moderada", "warning");
    if (s >= 2) return I("Dependencia grave", "bad");
    return I("Dependencia total", "bad");
  },
};

// ─── Mini-Mental (MMSE) ────────────────────────────────────────────────────
// Transcripción de la lámina de la doctora (Folstein et al. 1975, versión del
// Hospital Clínic de Barcelona). Ojo: esta versión reparte los 30 puntos
// distinto del MMSE clásico — la orientación son 9 ítems (no pregunta el día
// del mes) y la copia del dibujo vale 2 puntos. El total sigue siendo 30, así
// que los puntos de corte no cambian.
const MMSE: ScaleDefinition = {
  type: "MMSE",
  name: "Mini-Mental (MMSE)",
  sphere: "Cognición",
  category: "Cribado cognitivo global",
  description:
    "Examen cognitivo breve (0–30), verbatim de la lámina (Folstein 1975, versión Clínic Barcelona). Ajustar por escolaridad: el sistema no aplica corrección automática.",
  maxScore: 30,
  betterWhenHigher: true,
  stimulus: {
    src: "/laminas/mmse-estimulos.jpg",
    alt: "Lámina de estímulos del MMSE: pentágonos entrelazados y la orden “CIERRE LOS OJOS”",
    caption: "Mostrale esta lámina para los ítems de lectura y de copia del dibujo.",
    // Aparece recién en el ítem de lectura, que es donde empieza a usarse
    // (lectura y, dos ítems después, la copia del dibujo).
    beforeQuestion: "lectura",
  },
  questions: [
    // Orientación (9)
    { id: "o_ano", section: "Orientación", text: "¿En qué año estamos?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "o_estacion", section: "Orientación", text: "¿En qué estación del año estamos?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "o_dia_semana", section: "Orientación", text: "¿Qué día de la semana es hoy?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "o_mes", section: "Orientación", text: "¿En qué mes del año estamos?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "o_pais", section: "Orientación", text: "¿En qué país estamos?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "o_provincia", section: "Orientación", text: "¿En qué provincia estamos?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "o_ciudad", section: "Orientación", text: "¿En qué ciudad estamos?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "o_donde", section: "Orientación", text: "¿Dónde estamos en este momento?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "o_piso", section: "Orientación", text: "¿En qué piso/planta estamos?", kind: "options", options: CORRECTO_INCORRECTO },
    // Fijación (3)
    {
      id: "fijacion",
      section: "Fijación",
      text: "Nombrar tres objetos a intervalos de 1 segundo: bicicleta, cuchara, manzana.",
      help: "1 punto por cada respuesta correcta. Repetir los objetos hasta que el paciente aprenda los tres.",
      kind: "range",
      max: 3,
    },
    // Atención y cálculo (5)
    {
      id: "atencion_calculo",
      section: "Atención y cálculo",
      text: "Restar de 100 de 7 en 7. Parar después de 5 respuestas (100 - 93 - 86 - 79 - 72 - 65).",
      help: "1 punto por cada respuesta correcta.",
      kind: "range",
      max: 5,
    },
    // Memoria (3)
    {
      id: "memoria",
      section: "Memoria",
      text: "Preguntar los nombres de los tres objetos (bicicleta, cuchara, manzana).",
      help: "1 punto por cada respuesta correcta.",
      kind: "range",
      max: 3,
    },
    // Lenguaje (10)
    {
      id: "nominacion",
      section: "Lenguaje",
      text: "Señalar un lápiz y un reloj. Hacer que el paciente los denomine.",
      help: "1 punto por cada acierto.",
      kind: "range",
      max: 2,
    },
    {
      id: "repeticion",
      section: "Lenguaje",
      text: "Hacer que el paciente repita: NI SI, NI NO, NI PERO.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    {
      id: "ordenes",
      section: "Lenguaje",
      text: "Hacer que el paciente siga tres órdenes: COJA ESTE PAPEL CON LA MANO DERECHA, DÓBLELO POR LA MITAD Y DÉJELO EN EL SUELO.",
      help: "1 punto por cada sección de la orden hecha correctamente.",
      kind: "range",
      max: 3,
    },
    {
      id: "lectura",
      section: "Lenguaje",
      text: "El paciente tiene que leer y hacer lo siguiente: CIERRE LOS OJOS.",
      help: "Mostrale la lámina de estímulos.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    {
      id: "escritura",
      section: "Lenguaje",
      text: "Hacer que el paciente escriba una frase (sujeto, verbo y objeto).",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    {
      id: "copia",
      section: "Lenguaje",
      text: "Hacer copiar el dibujo (pentágonos entrelazados).",
      help: "1 punto por cada dibujo realizado.",
      kind: "range",
      max: 2,
    },
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
  sphere: "Cognición",
  category: "Cribado cognitivo global",
  description:
    "Evaluación cognitiva de Montreal (0–30). La interpretación suma automáticamente 1 punto si el paciente tiene ≤12 años de escolaridad.",
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
  // Se suma 1 punto (sin superar 30) si la escolaridad es ≤12 años (franja
  // baja o media). La interpretación usa ese puntaje ajustado.
  interpret: (s, ctx) => {
    const band = educationBand(ctx);
    const adj = band === "low" || band === "mid" ? Math.min(s + 1, 30) : s;
    if (adj >= 26) return I("Normal", "good");
    if (adj >= 18) return I("Deterioro cognitivo leve", "warning");
    if (adj >= 10) return I("Deterioro cognitivo moderado", "bad");
    return I("Deterioro cognitivo grave", "bad");
  },
};

// ─── Test del reloj ────────────────────────────────────────────────────────
const RELOJ: ScaleDefinition = {
  type: "RELOJ",
  name: "Test del reloj",
  sphere: "Cognición",
  category: "Cribado cognitivo global",
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
  sphere: "Cognición",
  category: "Cribado cognitivo global",
  description:
    "Cribado cognitivo por errores (0–10). Mayor número de errores = peor. El umbral se ajusta por escolaridad: se tolera 1 error más con baja escolaridad y 1 menos con estudios superiores.",
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
  // Umbral base de "intacto" = 2 errores; +1 con baja escolaridad, −1 con
  // estudios superiores (regla estándar del SPMSQ).
  interpret: (s, ctx) => {
    const band = educationBand(ctx);
    const t = 2 + (band === "low" ? 1 : band === "high" ? -1 : 0);
    if (s <= t) return I("Función intelectual intacta", "good");
    if (s <= t + 2) return I("Deterioro cognitivo leve", "warning");
    if (s <= t + 5) return I("Deterioro cognitivo moderado", "bad");
    return I("Deterioro cognitivo severo", "bad");
  },
};
function PRESENTE_AUSENTE_ERR(): ScaleOption[] {
  return [
    { label: "Correcto", value: 0 },
    { label: "Error", value: 1 },
  ];
}

// ─── CAM (Confusion Assessment Method) — algoritmo de delirium ──────────────
// No es una suma: el delirium es probable si hay (1) inicio agudo/curso
// fluctuante Y (2) inatención Y ( (3) pensamiento desorganizado O (4)
// alteración del nivel de conciencia ). El puntaje se representa como 1
// (positivo) / 0 (negativo) mediante `computeScore`.
const CAM: ScaleDefinition = {
  type: "CAM",
  name: "CAM (evaluación de delirium)",
  sphere: "Cognición",
  category: "Delirium",
  description:
    "Cribado de delirium por algoritmo. Es positivo si hay inicio agudo/curso fluctuante e inatención, más pensamiento desorganizado o alteración de la conciencia.",
  maxScore: 1,
  betterWhenHigher: false,
  questions: [
    { id: "inicio_agudo", text: "1. Inicio agudo y curso fluctuante", kind: "options", options: PRESENTE_AUSENTE },
    { id: "inatencion", text: "2. Inatención (dificultad para mantener la atención)", kind: "options", options: PRESENTE_AUSENTE },
    { id: "pensamiento_desorganizado", text: "3. Pensamiento desorganizado (incoherente, ilógico)", kind: "options", options: PRESENTE_AUSENTE },
    { id: "alteracion_conciencia", text: "4. Alteración del nivel de conciencia (distinto de alerta)", kind: "options", options: PRESENTE_AUSENTE },
  ],
  computeScore: (answers) => {
    // Cada feature guarda el índice de la opción; "Presente" vale 1.
    const present = (id: string): boolean => {
      const q = CAM.questions.find((qq) => qq.id === id);
      if (!q || q.kind !== "options") return false;
      const opt = q.options[Number(answers[id])];
      return !!opt && optionPoints(opt) === 1;
    };
    const positivo =
      present("inicio_agudo") &&
      present("inatencion") &&
      (present("pensamiento_desorganizado") || present("alteracion_conciencia"));
    return positivo ? 1 : 0;
  },
  interpret: (s) =>
    s >= 1 ? I("CAM positivo — delirium probable", "bad") : I("CAM negativo", "good"),
};

// ─── T@M (Test de Alteración de Memoria) ────────────────────────────────────
// Transcripción verbatim de la lámina de la doctora: Rami L, Molinuevo JL,
// Bosch B, Sánchez-Valle R, Villar A (Int J Geriatr Psychiatry 2007; 22:294-7),
// Unidad Memoria-Alzheimer, Hospital Clínic i Universitari de Barcelona.
// 43 ítems en 5 subpruebas: inmediata 10 + orientación 5 + semántica 15 +
// evocación libre 10 + evocación con pistas 10 = 50.
// La lámina no trae puntos de corte: los de abajo están PENDIENTES de que la
// doctora los confirme (ver descripción).
// Uso permitido en la práctica clínica; no autorizado el uso comercial ni de
// investigación del test (© Rami L B-5483-04).
const TAM_INMEDIATA = "Memoria inmediata";
const TAM_ORIENTACION = "Memoria de orientación temporal";
const TAM_SEMANTICA = "Memoria remota semántica";
const TAM_LIBRE = "Memoria de evocación libre";
const TAM_PISTAS = "Memoria de evocación con pistas";
// Encabezados de grupo de la lámina, como nota de contexto de sus ítems.
const GATOS = "¿Se acuerda de la frase de los gatos?";
const NINO = "¿Se acuerda de la frase del niño?";
const TAM: ScaleDefinition = {
  type: "TAM",
  name: "Test de Alteración de Memoria (T@M)",
  sphere: "Cognición",
  category: "Memoria",
  description:
    "Cribado de memoria: 43 ítems, 0–50 (Rami et al., 2007). Marcá el acierto de cada ítem tal como figura en la lámina. Puntos de corte a confirmar con la profesional.",
  maxScore: 50,
  betterWhenHigher: true,
  questions: [
    // ── Memoria inmediata (10) ──
    {
      id: "q1",
      section: TAM_INMEDIATA,
      text: "Le he dicho una fruta, ¿cuál era?",
      help:
        "Antes de empezar: “Intente memorizar estas palabras. Es importante que esté atento/a”. Repita: cereza (fruta), hacha (herramienta), elefante (animal), piano (instrumento musical), verde (color). Si un ítem es 0, repetir la palabra. Al terminar: “Después le pediré que recuerde estas palabras”.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    { id: "q2", section: TAM_INMEDIATA, text: "Le he dicho una herramienta, ¿cuál era?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q3", section: TAM_INMEDIATA, text: "Le he dicho un animal, ¿cuál?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q4", section: TAM_INMEDIATA, text: "Le he dicho un instrumento musical, ¿cuál?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q5", section: TAM_INMEDIATA, text: "Le he dicho un color, ¿cuál?", kind: "options", options: CORRECTO_INCORRECTO },
    {
      id: "q6",
      section: TAM_INMEDIATA,
      text: "¿Cuántos gatos había?",
      help:
        "“Esté atenta/o a estas frases e intente memorizarlas” (máximo 2 intentos de repetición). Repita: “TREINTA GATOS GRISES SE COMIERON TODOS LOS QUESOS”. Si un ítem es 0, decirle la respuesta correcta.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    { id: "q7", section: TAM_INMEDIATA, text: "¿De qué color eran?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q8", section: TAM_INMEDIATA, text: "¿Qué se comieron?", kind: "options", options: CORRECTO_INCORRECTO },
    {
      id: "q9",
      section: TAM_INMEDIATA,
      text: "¿Cómo se llamaba el niño?",
      help:
        "Repita (máximo 2 intentos): “UN NIÑO LLAMADO LUIS JUGABA CON SU BICICLETA”. Si un ítem es 0, decirle la respuesta correcta.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    { id: "q10", section: TAM_INMEDIATA, text: "¿Con qué jugaba?", kind: "options", options: CORRECTO_INCORRECTO },
    // ── Memoria de orientación temporal (5) ──
    { id: "q11", section: TAM_ORIENTACION, text: "Día de la semana", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q12", section: TAM_ORIENTACION, text: "Mes", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q13", section: TAM_ORIENTACION, text: "Día del mes", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q14", section: TAM_ORIENTACION, text: "Año", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q15", section: TAM_ORIENTACION, text: "Estación", kind: "options", options: CORRECTO_INCORRECTO },
    // ── Memoria remota semántica (15) ──
    {
      id: "q16",
      section: TAM_SEMANTICA,
      text: "¿Cuál es su fecha de nacimiento?",
      help: "2 intentos por ítem; si hay error, repetir de nuevo la pregunta.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    { id: "q17", section: TAM_SEMANTICA, text: "¿Cómo se llama el profesional que arregla coches?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q18", section: TAM_SEMANTICA, text: "¿Cómo se llamaba el anterior presidente de gobierno?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q19", section: TAM_SEMANTICA, text: "¿Cuál es el último día del año?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q20", section: TAM_SEMANTICA, text: "¿Cuántos días tiene un año que no sea bisiesto?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q21", section: TAM_SEMANTICA, text: "¿Cuántos gramos hay en un cuarto de kilo?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q22", section: TAM_SEMANTICA, text: "¿Cuál es el octavo mes del año?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q23", section: TAM_SEMANTICA, text: "¿Qué día se celebra la Navidad?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q24", section: TAM_SEMANTICA, text: "Si el reloj marca las 11 en punto, ¿en qué número se sitúa la aguja larga?", kind: "options", options: CORRECTO_INCORRECTO },
    {
      id: "q25",
      section: TAM_SEMANTICA,
      text: "¿Qué estación del año empieza en septiembre después del verano?",
      help:
        "Redacción original de la lámina (hemisferio norte). En Paraguay septiembre empieza la primavera después del invierno: confirmar con la profesional si adapta el enunciado.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    { id: "q26", section: TAM_SEMANTICA, text: "¿Qué animal bíblico engañó a Eva con una manzana?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q27", section: TAM_SEMANTICA, text: "¿De qué fruta se obtiene el mosto?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q28", section: TAM_SEMANTICA, text: "¿A partir de qué fruto se obtiene el chocolate?", kind: "options", options: CORRECTO_INCORRECTO },
    {
      id: "q29",
      section: TAM_SEMANTICA,
      text: "¿Cuánto es el triple de 1?",
      help: "Así figura en la lámina; confirmar con la profesional si su versión usa otra cifra.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    { id: "q30", section: TAM_SEMANTICA, text: "¿Cuántas horas hay en dos días?", kind: "options", options: CORRECTO_INCORRECTO },
    // ── Memoria de evocación libre (10) ──
    {
      id: "q31",
      section: TAM_LIBRE,
      text: "De las palabras que dije al principio, ¿cuáles podría recordar?",
      help: "Esperar la respuesta un mínimo de 20 segundos. 1 punto por palabra evocada.",
      kind: "range",
      max: 5,
    },
    {
      id: "q32",
      section: TAM_LIBRE,
      text: "¿Se acuerda de la frase de los gatos?",
      help: "1 punto por idea: Treinta – grises – quesos.",
      kind: "range",
      max: 3,
    },
    {
      id: "q33",
      section: TAM_LIBRE,
      text: "¿Se acuerda de la frase del niño?",
      help: "1 punto por idea: Luis – bicicleta.",
      kind: "range",
      max: 2,
    },
    // ── Memoria de evocación con pistas (10) ──
    {
      id: "q34",
      section: TAM_PISTAS,
      text: "Le dije una fruta, ¿cuál era?",
      help: "Puntuar 1 en las ideas ya evocadas de forma libre.",
      kind: "options",
      options: CORRECTO_INCORRECTO,
    },
    { id: "q35", section: TAM_PISTAS, text: "Le dije una herramienta, ¿cuál?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q36", section: TAM_PISTAS, text: "Le dije un animal, ¿cuál era?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q37", section: TAM_PISTAS, text: "Un instrumento musical, ¿cuál?", kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q38", section: TAM_PISTAS, text: "Le dije un color, ¿cuál?", kind: "options", options: CORRECTO_INCORRECTO },
    // En la lámina, 39–41 y 42–43 van bajo el encabezado de su frase; se
    // conserva el enunciado textual y el contexto va en la nota.
    { id: "q39", section: TAM_PISTAS, text: "¿Cuántos gatos había?", help: GATOS, kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q40", section: TAM_PISTAS, text: "¿De qué color eran?", help: GATOS, kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q41", section: TAM_PISTAS, text: "¿Qué comían?", help: GATOS, kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q42", section: TAM_PISTAS, text: "¿Cómo se llamaba?", help: NINO, kind: "options", options: CORRECTO_INCORRECTO },
    { id: "q43", section: TAM_PISTAS, text: "¿Con qué estaba jugando?", help: NINO, kind: "options", options: CORRECTO_INCORRECTO },
  ],
  // PENDIENTE: cortes provisorios; la lámina no los incluye y la publicación
  // original usa umbrales más bajos. Confirmar con la doctora antes de darles
  // valor clínico (el puntaje /50 sí es fiel a la lámina).
  interpret: (s) => {
    if (s >= 48) return I("Normal", "good");
    if (s >= 38) return I("Posible deterioro de memoria (DCL amnésico)", "warning");
    return I("Sugestivo de demencia tipo Alzheimer", "bad");
  },
};

// ─── Yesavage (GDS-15) ─────────────────────────────────────────────────────
const NO_1 = [{ label: "Sí", value: 0 }, { label: "No", value: 1 }];
const SI_1 = [{ label: "Sí", value: 1 }, { label: "No", value: 0 }];
const YESAVAGE: ScaleDefinition = {
  type: "YESAVAGE",
  name: "Depresión Geriátrica de Yesavage (GDS-15)",
  sphere: "Social",
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
  sphere: "Funcionalidad",
  category: "Fragilidad",
  description: "Fenotipo de fragilidad (0–5). Mayor puntaje = más frágil.",
  maxScore: 5,
  betterWhenHigher: false,
  hidden: true, // retirada de la vista a pedido de la doctora; se usa FRAIL.
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
  sphere: "Funcionalidad",
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
  sphere: "Funcionalidad",
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
  sphere: "Funcionalidad",
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
  sphere: "Clínico",
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
  sphere: "Clínico",
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
  sphere: "Funcionalidad",
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
  sphere: "Funcionalidad",
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

// ─── Escala sociofamiliar de Gijón (abreviada, Barcelona) ──────────────────
// 5 ítems de 1 a 5 puntos (5–25). Mayor puntaje = peor situación social.
const SOCIAL_CAT = "Valoración social y familiar";
const GIJON: ScaleDefinition = {
  type: "GIJON",
  name: "Escala sociofamiliar de Gijón",
  sphere: "Social",
  category: SOCIAL_CAT,
  description:
    "Valoración del riesgo social (5–25). Mayor puntaje = peor situación social. Versión abreviada (Barcelona).",
  maxScore: 25,
  betterWhenHigher: false,
  questions: [
    {
      id: "familiar",
      text: "Situación familiar",
      kind: "options",
      options: [
        { label: "Vive con familia, sin dependencia físico/psíquica", value: 1 },
        { label: "Vive con cónyuge de similar edad", value: 2 },
        { label: "Vive con familia y/o cónyuge con algún grado de dependencia", value: 3 },
        { label: "Vive solo/a y tiene hijos próximos", value: 4 },
        { label: "Vive solo/a y carece de hijos o viven alejados", value: 5 },
      ],
    },
    {
      id: "economica",
      text: "Situación económica",
      kind: "options",
      options: [
        { label: "Más de 1,5 veces el salario mínimo", value: 1 },
        { label: "Entre 1 y 1,5 veces el salario mínimo", value: 2 },
        { label: "Equivalente al salario mínimo / pensión contributiva mínima", value: 3 },
        { label: "Pensión no contributiva o ingreso inferior al mínimo", value: 4 },
        { label: "Sin ingresos o por debajo de los anteriores", value: 5 },
      ],
    },
    {
      id: "vivienda",
      text: "Vivienda",
      kind: "options",
      options: [
        { label: "Adecuada a las necesidades", value: 1 },
        { label: "Barreras arquitectónicas, pero con elementos que las compensan", value: 2 },
        { label: "Humedades, mala higiene o equipamiento inadecuado", value: 3 },
        { label: "Ausencia de equipamientos mínimos (agua, baño, electricidad)", value: 4 },
        { label: "Vivienda inadecuada o ausencia de vivienda", value: 5 },
      ],
    },
    {
      id: "relaciones",
      text: "Relaciones sociales",
      kind: "options",
      options: [
        { label: "Mantiene relaciones sociales fuera del domicilio", value: 1 },
        { label: "Se relaciona solo con familia y vecinos", value: 2 },
        { label: "Se relaciona solo con familia o solo con vecinos", value: 3 },
        { label: "No sale del domicilio, pero recibe visitas", value: 4 },
        { label: "No sale del domicilio ni recibe visitas", value: 5 },
      ],
    },
    {
      id: "apoyo",
      text: "Apoyo de la red social",
      kind: "options",
      options: [
        { label: "Con apoyo familiar o vecinal suficiente", value: 1 },
        { label: "Con apoyo de voluntariado o ayuda domiciliaria", value: 2 },
        { label: "No tiene apoyo, pero podría tenerlo", value: 3 },
        { label: "Pendiente de ingreso en residencia geriátrica", value: 4 },
        { label: "Necesita cuidados permanentes que no recibe", value: 5 },
      ],
    },
  ],
  interpret: (s) => {
    if (s <= 9) return I("Situación social buena", "good");
    if (s <= 14) return I("Riesgo social", "warning");
    return I("Problema social", "bad");
  },
};

// ─── APGAR familiar ─────────────────────────────────────────────────────────
// 5 ítems de 0 a 2 (0–10). Mayor puntaje = mejor función familiar.
const APGAR_OPTS = [
  { label: "Casi nunca", value: 0 },
  { label: "A veces", value: 1 },
  { label: "Casi siempre", value: 2 },
];
const APGAR: ScaleDefinition = {
  type: "APGAR",
  name: "APGAR familiar",
  sphere: "Social",
  category: SOCIAL_CAT,
  description: "Percepción de la función familiar (0–10). Mayor puntaje = mejor función familiar.",
  maxScore: 10,
  betterWhenHigher: true,
  questions: [
    { id: "adaptacion", text: "Me satisface la ayuda que recibo de mi familia cuando tengo un problema o necesidad", kind: "options", options: APGAR_OPTS },
    { id: "participacion", text: "Me satisface cómo mi familia habla y comparte los problemas conmigo", kind: "options", options: APGAR_OPTS },
    { id: "crecimiento", text: "Me satisface cómo mi familia acepta y apoya mis deseos de emprender nuevas actividades", kind: "options", options: APGAR_OPTS },
    { id: "afecto", text: "Me satisface cómo mi familia expresa afecto y responde a mis emociones (rabia, tristeza, amor)", kind: "options", options: APGAR_OPTS },
    { id: "resolucion", text: "Me satisface cómo compartimos en mi familia el tiempo, los espacios y el dinero", kind: "options", options: APGAR_OPTS },
  ],
  interpret: (s) => {
    if (s >= 7) return I("Familia funcional", "good");
    if (s >= 4) return I("Disfunción familiar leve", "warning");
    return I("Disfunción familiar grave", "bad");
  },
};

// ─── Escala de sobrecarga del cuidador de Zarit ────────────────────────────
// 22 ítems de 1 a 5 (22–110). Evalúa al CUIDADOR. Mayor puntaje = más sobrecarga.
const ZARIT_OPTS = [
  { label: "Nunca", value: 1 },
  { label: "Rara vez", value: 2 },
  { label: "Algunas veces", value: 3 },
  { label: "Bastantes veces", value: 4 },
  { label: "Casi siempre", value: 5 },
];
const ZARIT_ITEMS: string[] = [
  "¿Siente que su familiar solicita más ayuda de la que realmente necesita?",
  "¿Siente que, por el tiempo que dedica a su familiar, ya no dispone de tiempo suficiente para usted?",
  "¿Se siente tenso/a cuando tiene que cuidar a su familiar y atender además otras responsabilidades?",
  "¿Se siente avergonzado/a por el comportamiento de su familiar?",
  "¿Se siente enfadado/a cuando está cerca de su familiar?",
  "¿Cree que la situación afecta de forma negativa su relación con otros familiares o amigos?",
  "¿Siente temor por el futuro que le espera a su familiar?",
  "¿Siente que su familiar depende de usted?",
  "¿Se siente agobiado/a cuando tiene que estar junto a su familiar?",
  "¿Siente que su salud se ha resentido por cuidar a su familiar?",
  "¿Siente que no tiene la vida privada que desearía por cuidar a su familiar?",
  "¿Cree que su vida social se ha visto afectada por cuidar a su familiar?",
  "¿Se siente incómodo/a para invitar amigos a casa por cuidar a su familiar?",
  "¿Cree que su familiar espera que usted le cuide como si fuera la única persona con quien puede contar?",
  "¿Cree que no dispone de dinero suficiente para cuidar a su familiar además de sus otros gastos?",
  "¿Siente que será incapaz de cuidar a su familiar por mucho más tiempo?",
  "¿Siente que ha perdido el control sobre su vida desde que comenzó la enfermedad de su familiar?",
  "¿Desearía poder dejar el cuidado de su familiar a otras personas?",
  "¿Se siente inseguro/a acerca de lo que debe hacer con su familiar?",
  "¿Siente que debería hacer más de lo que hace por su familiar?",
  "¿Cree que podría cuidar a su familiar mejor de lo que lo hace?",
  "En general, ¿se siente muy sobrecargado/a por tener que cuidar de su familiar?",
];
const ZARIT: ScaleDefinition = {
  type: "ZARIT",
  name: "Escala de sobrecarga del cuidador de Zarit",
  sphere: "Social",
  category: SOCIAL_CAT,
  description:
    "Sobrecarga del cuidador principal (22–110). Se aplica al CUIDADOR, no al paciente. Mayor puntaje = más sobrecarga.",
  maxScore: 110,
  betterWhenHigher: false,
  questions: ZARIT_ITEMS.map((text, i) => ({
    id: `z${i + 1}`,
    text,
    kind: "options" as const,
    options: ZARIT_OPTS,
  })),
  interpret: (s) => {
    if (s < 47) return I("Sin sobrecarga", "good");
    if (s <= 55) return I("Sobrecarga leve", "warning");
    return I("Sobrecarga intensa", "bad");
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
  CAM,
  TAM,
  YESAVAGE,
  FRIED,
  FRAIL,
  TUG,
  TINETTI,
  MNA,
  CHARLSON,
  BRADEN,
  NORTON,
  GIJON,
  APGAR,
  ZARIT,
};

/** Categorías en orden de presentación (incluye ocultas para compatibilidad). */
export const SCALE_CATEGORIES: string[] = (() => {
  const seen: string[] = [];
  for (const t of SCALE_TYPES) {
    const c = SCALE_DEFINITIONS[t].category;
    if (!seen.includes(c)) seen.push(c);
  }
  return seen;
})();

/** Tipos de escala visibles (excluye las marcadas como `hidden`). */
export const VISIBLE_SCALE_TYPES: ScaleType[] = SCALE_TYPES.filter(
  (t) => !SCALE_DEFINITIONS[t].hidden,
);

/** Un subgrupo dentro de una esfera, con sus escalas visibles en orden. */
export interface ScaleCategoryGroup {
  category: string;
  types: ScaleType[];
}
/** Una esfera de la VGI con sus subgrupos. */
export interface ScaleSphereGroup {
  sphere: ScaleSphere;
  categories: ScaleCategoryGroup[];
}

/**
 * Escalas visibles agrupadas por esfera → subgrupo, en orden de presentación.
 * Es la estructura que consume el listado de escalas (2 niveles).
 */
export const SCALE_GROUPS: ScaleSphereGroup[] = (() => {
  const groups: ScaleSphereGroup[] = [];
  for (const sphere of SCALE_SPHERES) {
    const categories: ScaleCategoryGroup[] = [];
    for (const t of VISIBLE_SCALE_TYPES) {
      const def = SCALE_DEFINITIONS[t];
      if (def.sphere !== sphere) continue;
      let cat = categories.find((c) => c.category === def.category);
      if (!cat) {
        cat = { category: def.category, types: [] };
        categories.push(cat);
      }
      cat.types.push(t);
    }
    if (categories.length) groups.push({ sphere, categories });
  }
  return groups;
})();

export function getScaleDefinition(type: string): ScaleDefinition | null {
  return (SCALE_DEFINITIONS as Record<string, ScaleDefinition>)[type] ?? null;
}

/**
 * Calcula el puntaje total a partir de las respuestas, validando contra la
 * definición. Lanza si una respuesta es inválida o falta.
 *
 * Semántica de `answers`:
 *  - preguntas de tipo "options": el valor guardado es el ÍNDICE de la opción
 *    elegida (no los puntos), para preservar el nivel exacto incluso cuando
 *    varias opciones suman lo mismo o el puntaje depende del sexo (Lawton).
 *  - "range"/"number": el valor guardado son los puntos directamente.
 */
export function computeScaleScore(
  def: ScaleDefinition,
  answers: ScaleAnswers,
  ctx?: ScaleContext,
): number {
  let total = 0;
  for (const q of def.questions) {
    const raw = answers[q.id];
    if (raw === undefined || raw === null || Number.isNaN(Number(raw))) {
      throw new Error(`Falta la respuesta de "${q.text}"`);
    }
    const value = Number(raw);
    if (q.kind === "options") {
      const opt = q.options[value];
      if (!Number.isInteger(value) || !opt) {
        throw new Error(`Respuesta inválida en "${q.text}"`);
      }
      total += optionPoints(opt, ctx?.sex);
    } else if (q.kind === "range") {
      if (value < 0 || value > q.max) throw new Error(`Valor fuera de rango en "${q.text}"`);
      total += value;
    } else {
      if (value < q.min || value > q.max) throw new Error(`Valor fuera de rango en "${q.text}"`);
      total += value;
    }
  }
  // Escalas con puntaje no aditivo (CAM): el total sumado se ignora y se usa
  // el algoritmo, una vez validado que todas las respuestas están presentes.
  return def.computeScore ? def.computeScore(answers, ctx) : total;
}

/**
 * Puntos de una respuesta concreta, con la semántica de `answers` (índice de
 * opción en "options", puntos directos en "range"/"number"). Devuelve 0 si la
 * respuesta falta o es inválida.
 */
export function questionPoints(q: ScaleQuestion, value: number | undefined, sex?: Sex): number {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 0;
  const n = Number(value);
  if (q.kind === "options") {
    const opt = Number.isInteger(n) ? q.options[n] : undefined;
    return opt ? optionPoints(opt, sex) : 0;
  }
  return n;
}

/** Puntos máximos alcanzables en una pregunta. */
export function questionMaxPoints(q: ScaleQuestion, sex?: Sex): number {
  if (q.kind === "options") {
    return q.options.reduce((m, o) => Math.max(m, optionPoints(o, sex)), 0);
  }
  return q.max;
}

/** Bloque de preguntas de una escala (secciones de la T@M, del MMSE, etc.). */
export interface ScaleSection {
  /** Título del bloque; null para las preguntas sin sección declarada. */
  section: string | null;
  questions: ScaleQuestion[];
  /** Máximo alcanzable en el bloque (resuelto por sexo cuando aplica). */
  max: number;
}

/**
 * Agrupa las preguntas en bloques consecutivos por `section`, preservando el
 * orden de la definición (y por lo tanto la numeración de la lámina). Las
 * escalas sin secciones devuelven un único bloque con `section: null`.
 */
export function scaleSections(def: ScaleDefinition, sex?: Sex): ScaleSection[] {
  const out: ScaleSection[] = [];
  for (const q of def.questions) {
    const section = q.section ?? null;
    const last = out[out.length - 1];
    if (last && last.section === section) {
      last.questions.push(q);
      last.max += questionMaxPoints(q, sex);
    } else {
      out.push({ section, questions: [q], max: questionMaxPoints(q, sex) });
    }
  }
  return out;
}

/**
 * Puntos sumados de un bloque, tolerante a ítems sin responder.
 *
 * OJO al presentarlo: en las escalas donde más puntaje es PEOR
 * (`betterWhenHigher: false`, p. ej. Yesavage, Zarit, Charlson) el máximo del
 * bloque es el peor resultado posible, así que mostrarlo como "x / max" se lee
 * al revés. Hoy ninguna de esas escalas usa secciones; si se les agregan, hay
 * que mostrar el subtotal sin denominador o invertir la redacción.
 */
export function sectionScore(
  section: ScaleSection,
  answers: ScaleAnswers,
  sex?: Sex,
): number {
  return section.questions.reduce((t, q) => t + questionPoints(q, answers[q.id], sex), 0);
}

/**
 * Puntaje parcial (tolerante a ítems sin responder), para el cálculo en vivo
 * del formulario. Usa la misma semántica de índices que `computeScaleScore`.
 */
export function partialScaleScore(
  def: ScaleDefinition,
  answers: ScaleAnswers,
  ctx?: ScaleContext,
): number {
  // El algoritmo (CAM) tolera respuestas faltantes (las trata como ausentes).
  if (def.computeScore) return def.computeScore(answers, ctx);
  return def.questions.reduce((t, q) => t + questionPoints(q, answers[q.id], ctx?.sex), 0);
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
