/**
 * Rutas de Documentos y estudios (Fase 5): subida (multipart), listado,
 * streaming para previsualización/descarga y baja lógica. Montadas bajo
 * /patients. Requieren permisos clínicos.
 */
import fs from "node:fs";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { documentMetadataSchema, parseDate, PERMISSIONS, type DocumentItem } from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { recordAudit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";
import { uploadSingle, absolutePath, removeFile, relativePathFor } from "../lib/storage.js";

export const documentsRouter: Router = Router();
documentsRouter.use(requireAuth);

async function ensurePatient(patientId: string): Promise<string> {
  const p = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: { id: true },
  });
  if (!p) throw notFound("Paciente no encontrado");
  return p.id;
}

function serialize(d: {
  id: string;
  title: string;
  category: DocumentItem["category"];
  studyDate: Date | null;
  fileName: string;
  mimeType: string;
  size: number;
  notes: string | null;
  createdAt: Date;
}): DocumentItem {
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    studyDate: d.studyDate ? d.studyDate.toISOString() : null,
    fileName: d.fileName,
    mimeType: d.mimeType,
    size: d.size,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
  };
}

// Envuelve el middleware de multer para traducir sus errores a 400.
function handleUpload(req: Request, res: Response, next: NextFunction) {
  uploadSingle(req, res, (err: unknown) => {
    if (err) return next(badRequest(err instanceof Error ? err.message : "Error al subir el archivo"));
    next();
  });
}

// GET /:patientId/documents  → listado.
documentsRouter.get(
  "/:patientId/documents",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const docs = await prisma.document.findMany({
        where: { patientId, deletedAt: null },
        orderBy: [{ studyDate: "desc" }, { createdAt: "desc" }],
      });
      res.json({ data: docs.map(serialize) });
    } catch (err) {
      next(err);
    }
  },
);

// POST /:patientId/documents  → subir archivo + metadata (multipart).
documentsRouter.post(
  "/:patientId/documents",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  handleUpload,
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const file = req.file;
      if (!file) throw badRequest("Adjuntá un archivo");

      // Validamos la metadata (campos de texto del multipart).
      const parsed = documentMetadataSchema.safeParse(req.body);
      if (!parsed.success) {
        removeFile(relativePathFor(patientId, file.filename)); // limpiamos el archivo
        const error = badRequest("Datos inválidos");
        (error as { details?: unknown }).details = parsed.error.flatten().fieldErrors;
        throw error;
      }
      const { title, category, studyDate, notes } = parsed.data;

      const created = await prisma.document.create({
        data: {
          patientId,
          title,
          category,
          studyDate: studyDate ? parseDate(studyDate) : null,
          notes,
          fileName: file.originalname,
          storedPath: relativePathFor(patientId, file.filename),
          mimeType: file.mimetype,
          size: file.size,
          createdById: req.user!.id,
        },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "document.upload",
        resource: "document",
        resourceId: created.id,
        req,
      });
      res.status(201).json({ document: serialize(created) });
    } catch (err) {
      next(err);
    }
  },
);

// GET /:patientId/documents/:docId/file  → streaming (preview/descarga).
documentsRouter.get(
  "/:patientId/documents/:docId/file",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const doc = await prisma.document.findFirst({
        where: { id: String(req.params.docId), patientId, deletedAt: null },
      });
      if (!doc) throw notFound("Documento no encontrado");

      const abs = absolutePath(doc.storedPath);
      if (!fs.existsSync(abs)) throw notFound("El archivo ya no está disponible");

      // inline → el navegador previsualiza PDF/imágenes. Nombre en UTF-8.
      const encoded = encodeURIComponent(doc.fileName);
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encoded}`);
      await recordAudit({
        userId: req.user!.id,
        action: "document.view",
        resource: "document",
        resourceId: doc.id,
        req,
      });
      fs.createReadStream(abs).pipe(res);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /:patientId/documents/:docId  → baja lógica + borrado del archivo.
documentsRouter.delete(
  "/:patientId/documents/:docId",
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  async (req, res, next) => {
    try {
      const patientId = await ensurePatient(String(req.params.patientId));
      const doc = await prisma.document.findFirst({
        where: { id: String(req.params.docId), patientId, deletedAt: null },
      });
      if (!doc) throw notFound("Documento no encontrado");

      await prisma.document.update({ where: { id: doc.id }, data: { deletedAt: new Date() } });
      removeFile(doc.storedPath);
      await recordAudit({
        userId: req.user!.id,
        action: "document.delete",
        resource: "document",
        resourceId: doc.id,
        req,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
