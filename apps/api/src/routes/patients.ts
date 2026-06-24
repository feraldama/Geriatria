/**
 * Rutas de Pacientes (Fase 1): listado con búsqueda y paginación, ficha de
 * detalle, alta, edición y baja lógica (soft delete). Cada endpoint declara y
 * valida su permiso (RBAC) y deja registro de auditoría.
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  createPatientSchema,
  updatePatientSchema,
  PERMISSIONS,
  type Paginated,
  type PatientListItem,
} from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { validateBody } from "../middleware/validate.js";
import { recordAudit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";
import {
  toCreateData,
  applyUpdate,
  serializeDetail,
  serializeListItem,
  normalizeSearch,
} from "../lib/patient-mapper.js";

export const patientsRouter: Router = Router();

// Todas las rutas requieren sesión.
patientsRouter.use(requireAuth);

const detailInclude = {
  caregivers: { orderBy: { isPrimary: "desc" } },
  conditions: { orderBy: { createdAt: "asc" } },
  allergies: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.PatientInclude;

// GET /patients?q=&page=&pageSize=  → listado con búsqueda y paginación.
patientsRouter.get("/", requirePermission(PERMISSIONS.PATIENT_READ), async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    // Búsqueda insensible a mayúsculas y acentos contra el texto normalizado.
    const where: Prisma.PatientWhereInput = {
      deletedAt: null,
      ...(q ? { searchText: { contains: normalizeSearch(q) } } : {}),
    };

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        include: { _count: { select: { allergies: true } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const result: Paginated<PatientListItem> = {
      data: patients.map(serializeListItem),
      total,
      page,
      pageSize,
    };
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /patients/:id  → ficha de detalle.
patientsRouter.get("/:id", requirePermission(PERMISSIONS.PATIENT_READ), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: detailInclude,
    });
    if (!patient) throw notFound("Paciente no encontrado");

    await recordAudit({
      userId: req.user!.id,
      action: "patient.view",
      resource: "patient",
      resourceId: patient.id,
      req,
    });
    res.json({ patient: serializeDetail(patient) });
  } catch (err) {
    next(err);
  }
});

// POST /patients  → alta.
patientsRouter.post(
  "/",
  requirePermission(PERMISSIONS.PATIENT_WRITE),
  validateBody(createPatientSchema),
  async (req, res, next) => {
    try {
      const created = await prisma.patient.create({
        data: toCreateData(req.body, req.user!.id),
        include: detailInclude,
      });
      await recordAudit({
        userId: req.user!.id,
        action: "patient.create",
        resource: "patient",
        resourceId: created.id,
        req,
      });
      res.status(201).json({ patient: serializeDetail(created) });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /patients/:id  → edición.
patientsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.PATIENT_WRITE),
  validateBody(updatePatientSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.patient.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw notFound("Paciente no encontrado");

      const patient = await prisma.$transaction(async (tx) => {
        await applyUpdate(tx, id, req.body);
        return tx.patient.findUniqueOrThrow({ where: { id }, include: detailInclude });
      });

      await recordAudit({
        userId: req.user!.id,
        action: "patient.update",
        resource: "patient",
        resourceId: id,
        req,
      });
      res.json({ patient: serializeDetail(patient) });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /patients/:id  → baja lógica (nunca borrado físico).
patientsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.PATIENT_DELETE),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.patient.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw notFound("Paciente no encontrado");

      await prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
      await recordAudit({
        userId: req.user!.id,
        action: "patient.delete",
        resource: "patient",
        resourceId: id,
        req,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
