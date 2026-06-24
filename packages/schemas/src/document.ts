/**
 * Tipos y esquemas para Documentos y estudios (Fase 5).
 * El archivo viaja por multipart; estos esquemas validan la metadata.
 */
import { z } from "zod";
import { isValidDateString } from "./date";

export const DOCUMENT_CATEGORY = [
  "LABORATORIO",
  "IMAGEN",
  "INTERCONSULTA",
  "ELECTROCARDIOGRAMA",
  "OTRO",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORY)[number];
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  LABORATORIO: "Laboratorio",
  IMAGEN: "Imagen (Rx, TC, RM, eco)",
  INTERCONSULTA: "Interconsulta",
  ELECTROCARDIOGRAMA: "Electrocardiograma",
  OTRO: "Otro",
};

// Metadata que acompaña a la subida (campos del formulario multipart).
export const documentMetadataSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  category: z.enum(DOCUMENT_CATEGORY),
  studyDate: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine((v) => v === null || isValidDateString(v), "Fecha inválida (dd/mm/aaaa)"),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  studyDate: string | null; // ISO
  fileName: string;
  mimeType: string;
  size: number;
  notes: string | null;
  createdAt: string; // ISO (fecha de subida)
}

/** ¿El tipo MIME se puede previsualizar embebido en el navegador? */
export function isPreviewable(mimeType: string): "image" | "pdf" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  return null;
}

/** Formatea un tamaño en bytes a texto legible (KB/MB). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
