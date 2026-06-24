/**
 * Rutas de Agenda / Citas (Fase 2): listado por rango de fechas, alta, edición,
 * cambio de estado y cancelación (baja lógica). RBAC + auditoría en cada acción.
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  combineDateTime,
  PERMISSIONS,
  type AppointmentItem,
} from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { validateBody } from "../middleware/validate.js";
import { recordAudit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";

export const appointmentsRouter: Router = Router();
appointmentsRouter.use(requireAuth);

type AppointmentWithPatient = Prisma.AppointmentGetPayload<{
  include: { patient: { select: { firstName: true; lastName: true } } };
}>;

function serialize(a: AppointmentWithPatient): AppointmentItem {
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: `${a.patient.lastName}, ${a.patient.firstName}`,
    scheduledAt: a.scheduledAt.toISOString(),
    durationMin: a.durationMin,
    reason: a.reason,
    type: a.type,
    status: a.status,
    notes: a.notes,
  };
}

const withPatient = {
  patient: { select: { firstName: true, lastName: true } },
} satisfies Prisma.AppointmentInclude;

// GET /appointments?from=&to=  → citas en el rango [from, to) (ISO).
appointmentsRouter.get(
  "/",
  requirePermission(PERMISSIONS.APPOINTMENT_READ),
  async (req, res, next) => {
    try {
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;
      if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw badRequest("Indicá un rango válido con 'from' y 'to' (ISO)");
      }

      const appointments = await prisma.appointment.findMany({
        where: { deletedAt: null, scheduledAt: { gte: from, lt: to } },
        include: withPatient,
        orderBy: { scheduledAt: "asc" },
      });
      res.json({ data: appointments.map(serialize) });
    } catch (err) {
      next(err);
    }
  },
);

// POST /appointments  → crear cita.
appointmentsRouter.post(
  "/",
  requirePermission(PERMISSIONS.APPOINTMENT_WRITE),
  validateBody(createAppointmentSchema),
  async (req, res, next) => {
    try {
      const { patientId, date, time, durationMin, type, status, reason, notes } = req.body;

      const scheduledAt = combineDateTime(date, time);
      if (!scheduledAt) throw badRequest("Fecha u hora inválida");

      // El paciente debe existir y estar activo.
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, deletedAt: null },
        select: { id: true },
      });
      if (!patient) throw badRequest("El paciente indicado no existe");

      const created = await prisma.appointment.create({
        data: {
          patientId,
          scheduledAt,
          durationMin,
          type,
          status,
          reason,
          notes,
          createdById: req.user!.id,
        },
        include: withPatient,
      });
      await recordAudit({
        userId: req.user!.id,
        action: "appointment.create",
        resource: "appointment",
        resourceId: created.id,
        req,
      });
      res.status(201).json({ appointment: serialize(created) });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /appointments/:id  → editar (incluye cambio de estado).
appointmentsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.APPOINTMENT_WRITE),
  validateBody(updateAppointmentSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.appointment.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw notFound("Cita no encontrada");

      const { patientId, date, time, durationMin, type, status, reason, notes } = req.body;

      // Si cambió fecha u hora, recombinamos; requiere ambas presentes.
      let scheduledAt: Date | undefined;
      if (date !== undefined || time !== undefined) {
        if (date === undefined || time === undefined) {
          throw badRequest("Para reprogramar enviá fecha y hora juntas");
        }
        const combined = combineDateTime(date, time);
        if (!combined) throw badRequest("Fecha u hora inválida");
        scheduledAt = combined;
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          ...(patientId !== undefined ? { patientId } : {}),
          ...(scheduledAt ? { scheduledAt } : {}),
          ...(durationMin !== undefined ? { durationMin } : {}),
          ...(type !== undefined ? { type } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(reason !== undefined ? { reason } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
        include: withPatient,
      });
      await recordAudit({
        userId: req.user!.id,
        action: "appointment.update",
        resource: "appointment",
        resourceId: id,
        req,
      });
      res.json({ appointment: serialize(updated) });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /appointments/:id  → baja lógica de la cita.
appointmentsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.APPOINTMENT_WRITE),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.appointment.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw notFound("Cita no encontrada");

      await prisma.appointment.update({ where: { id }, data: { deletedAt: new Date() } });
      await recordAudit({
        userId: req.user!.id,
        action: "appointment.delete",
        resource: "appointment",
        resourceId: id,
        req,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
