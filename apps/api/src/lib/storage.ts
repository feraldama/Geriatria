/**
 * Capa de almacenamiento de archivos (documentos clínicos).
 *
 * Implementación actual: disco local bajo STORAGE_DIR/<patientId>/<archivo>.
 * La interfaz está pensada para migrar a S3/compatible más adelante sin tocar
 * las rutas: bastaría con cambiar el motor de subida y `streamFile`/`removeFile`.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import type { RequestHandler } from "express";
import { env } from "../env.js";

const ROOT = path.resolve(env.STORAGE_DIR);

/** Asegura y devuelve el directorio absoluto de un paciente. */
function patientDir(patientId: string): string {
  // patientId es un cuid generado por nosotros (sin separadores de ruta),
  // así que es seguro usarlo como nombre de carpeta.
  const dir = path.join(ROOT, patientId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Ruta relativa (a STORAGE_DIR) → ruta absoluta, validando que no escape. */
export function absolutePath(relativePath: string): string {
  const abs = path.resolve(ROOT, relativePath);
  if (!abs.startsWith(ROOT + path.sep)) {
    throw new Error("Ruta de archivo inválida");
  }
  return abs;
}

/** Elimina físicamente un archivo (best-effort; no rompe si ya no existe). */
export function removeFile(relativePath: string): void {
  try {
    fs.unlinkSync(absolutePath(relativePath));
  } catch {
    /* el archivo ya no existe: lo ignoramos */
  }
}

// Tipos MIME permitidos: PDF, imágenes comunes y DICOM.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/dicom",
  "application/octet-stream", // algunos .dcm llegan como octet-stream
]);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      cb(null, patientDir(String(req.params.patientId)));
    } catch (err) {
      cb(err as Error, "");
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 12);
    cb(null, `${randomUUID()}${ext}`);
  },
});

/** Middleware de subida de un único archivo (campo "file"). */
export const uploadSingle: RequestHandler = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
  },
}).single("file");

/** Ruta relativa guardada en BD para un archivo de un paciente. */
export function relativePathFor(patientId: string, storedName: string): string {
  return path.posix.join(patientId, storedName);
}
