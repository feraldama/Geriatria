/**
 * Examen físico y neurológico estructurado (Fase F).
 *
 * Cada campo es texto libre donde la profesional describe el hallazgo. Se
 * guarda como JSON embebido en la consulta (`physicalExam`): un mapa
 * { campoId: texto }. Los grupos siguen la ficha de la doctora.
 */
import { z } from "zod";

export interface ExamField {
  id: string;
  label: string;
}
export interface ExamGroup {
  key: string;
  title: string;
  fields: ExamField[];
}

export const PHYSICAL_EXAM_GROUPS: ExamGroup[] = [
  {
    key: "sistemas",
    title: "Examen físico por sistemas",
    fields: [
      { id: "piel", label: "Piel" },
      { id: "unas", label: "Uñas" },
      { id: "mucosas", label: "Mucosas" },
      { id: "cabeza_cuello", label: "Cabeza y cuello" },
      { id: "ojos", label: "Ojos" },
      { id: "oidos", label: "Oídos" },
      { id: "cavidad_oral", label: "Cavidad oral" },
      { id: "linfatico", label: "Sistema linfático" },
      { id: "cardiaco", label: "Sistema cardíaco" },
      { id: "respiratorio", label: "Sistema respiratorio" },
      { id: "gastrointestinal", label: "Sistema gastrointestinal" },
      { id: "urinario", label: "Sistema urinario" },
      { id: "reproductor", label: "Sistema reproductor" },
      { id: "oseo", label: "Sistema óseo" },
      { id: "nervioso", label: "Sistema nervioso (resumen)" },
    ],
  },
  {
    key: "pares_craneales",
    title: "Neurológico · Pares craneales",
    fields: [
      { id: "reflejos_pupilares", label: "Reflejos pupilares" },
      { id: "movimiento_ocular", label: "Movimiento ocular (horizontal, vertical, nistagmo)" },
      { id: "agudeza_visual", label: "Agudeza visual y campo" },
      { id: "facial", label: "Facial (sonrisa, enojo, ojos cerrados, arrugas, lengua)" },
      { id: "audicion", label: "Audición" },
    ],
  },
  {
    key: "reflejos",
    title: "Neurológico · Reflejos",
    fields: [
      { id: "osteotendinosos", label: "Reflejos osteotendinosos profundos" },
      { id: "babinski", label: "Babinski" },
      { id: "corticales_liberados", label: "Corticales liberados (prensión, succión, glabelar)" },
    ],
  },
  {
    key: "motor",
    title: "Neurológico · Fuerza y motricidad",
    fields: [
      { id: "fuerza_tono", label: "Fuerza y tono muscular" },
      { id: "dinamometro_masetero", label: "Dinamómetro masetero / temporal" },
      { id: "extremidades", label: "Extremidades" },
      { id: "levantarse_silla", label: "Levantarse de la silla con brazos cruzados (30 s)" },
    ],
  },
  {
    key: "marcha",
    title: "Neurológico · Marcha",
    fields: [
      { id: "inicio_deambulacion", label: "Inicio de la deambulación" },
      { id: "longitud_pasos", label: "Longitud de los pasos" },
      { id: "velocidad", label: "Velocidad" },
      { id: "base_sustentacion", label: "Base de sustentación" },
      { id: "postura", label: "Postura al caminar" },
      { id: "braceo", label: "Braceo" },
      { id: "desviacion", label: "Desviación" },
      { id: "giro", label: "Giro" },
    ],
  },
  {
    key: "equilibrio",
    title: "Neurológico · Equilibrio",
    fields: [
      { id: "eq_nistagmo", label: "Nistagmo" },
      { id: "tandem", label: "Posición tándem" },
      { id: "romberg", label: "Romberg" },
      { id: "retropulsion", label: "Retropulsión" },
    ],
  },
  {
    key: "temblores",
    title: "Neurológico · Temblores",
    fields: [
      { id: "temblor_distribucion", label: "Distribución (simétrico / asimétrico)" },
      { id: "temblor_momento", label: "Momento (reposo / actividad)" },
      { id: "temblor_frecuencia", label: "Frecuencia" },
    ],
  },
  {
    key: "coordinacion",
    title: "Neurológico · Coordinación",
    fields: [
      { id: "dedo_nariz", label: "Dedo-nariz" },
      { id: "mov_alternantes", label: "Movimientos alternantes" },
      { id: "imitacion_gestos", label: "Imitación de gestos" },
    ],
  },
];

/** Todos los ids de campo válidos (para sanitizar el JSON recibido). */
export const EXAM_FIELD_IDS: string[] = PHYSICAL_EXAM_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.id),
);

export type PhysicalExam = Record<string, string>;

/** Conserva solo campos conocidos con texto no vacío. */
export function sanitizePhysicalExam(input: unknown): PhysicalExam {
  if (!input || typeof input !== "object") return {};
  const valid = new Set(EXAM_FIELD_IDS);
  const out: PhysicalExam = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (valid.has(k) && typeof v === "string" && v.trim() !== "") {
      out[k] = v.trim();
    }
  }
  return out;
}

/** Schema del examen: mapa de campo→texto (se sanitiza en el backend). */
export const physicalExamSchema = z.record(z.string(), z.string()).optional().nullable();
