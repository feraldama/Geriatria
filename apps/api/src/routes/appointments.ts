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
  formatTime,
  MAX_DURATION_MIN,
  PERMISSIONS,
  type AppointmentItem,
} from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { validateBody } from "../middleware/validate.js";
import { recordAudit, diffFields } from "../lib/audit.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";

export const appointmentsRouter: Router = Router();
appointmentsRouter.use(requireAuth);

// Tope del rango consultable de la agenda. Sin límite, un ?from=1900&to=2100
// devolvería todas las citas con nombre de paciente en un solo JSON.
const MAX_RANGE_DAYS = 92;

// Ventana hacia atrás para buscar solapes. Se deriva del máximo que permite el
// esquema (MAX_DURATION_MIN): una cita que empiece antes de ese margen ya
// terminó, y con un número fijo el chequeo dejaría pasar dobles reservas en
// silencio si alguna vez se ampliara la duración máxima.
const OVERLAP_LOOKBACK_MS = MAX_DURATION_MIN * 60_000;

// Estados que ocupan un espacio real en la agenda (los cancelados y ausentes
// liberan el horario).
const BLOCKING_STATUSES = ["PROGRAMADA", "CONFIRMADA", "ATENDIDA"] as const;

/**
 * Rechaza citas que se pisan con otra ya agendada.
 *
 * Dos citas se solapan si una empieza antes de que termine la otra. Es una
 * validación de agenda: sin ella se puede citar a dos pacientes a la misma hora.
 */
async function assertNoOverlap(
  client: Prisma.TransactionClient,
  scheduledAt: Date,
  durationMin: number,
  excludeId?: string,
): Promise<void> {
  const end = new Date(scheduledAt.getTime() + durationMin * 60_000);

  // Prisma no puede comparar contra una columna calculada, así que acotamos por
  // una ventana amplia y verificamos el solape con precisión en memoria.
  const candidates = await client.appointment.findMany({
    where: {
      deletedAt: null,
      status: { in: [...BLOCKING_STATUSES] },
      patient: { deletedAt: null },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      scheduledAt: {
        gt: new Date(scheduledAt.getTime() - OVERLAP_LOOKBACK_MS),
        lt: end,
      },
    },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });

  const clash = candidates.find((c) => {
    const cEnd = new Date(c.scheduledAt.getTime() + c.durationMin * 60_000);
    return c.scheduledAt < end && cEnd > scheduledAt;
  });

  if (clash) {
    throw conflict(
      `El horario se superpone con la cita de ${clash.patient.lastName}, ` +
        `${clash.patient.firstName} (${formatTime(clash.scheduledAt)}).`,
    );
  }
}

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
      if (to <= from) throw badRequest("'to' debe ser posterior a 'from'");
      const rangeDays = (to.getTime() - from.getTime()) / 86_400_000;
      if (rangeDays > MAX_RANGE_DAYS) {
        throw badRequest(`El rango no puede superar los ${MAX_RANGE_DAYS} días`);
      }

      const appointments = await prisma.appointment.findMany({
        // Se excluyen citas de pacientes dados de baja: su ficha ya no es
        // accesible y mostrarlas llevaría a enlaces rotos (404).
        where: {
          deletedAt: null,
          scheduledAt: { gte: from, lt: to },
          patient: { deletedAt: null },
        },
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

      // La verificación de solape va dentro de la transacción: comprobarla
      // fuera permitiría que dos altas simultáneas la pasaran las dos.
      const created = await prisma.$transaction(async (tx) => {
        // Una cita cargada como CANCELADA/AUSENTE no ocupa el horario.
        if ((BLOCKING_STATUSES as readonly string[]).includes(status)) {
          await assertNoOverlap(tx, scheduledAt, durationMin);
        }
        return tx.appointment.create({
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

      const updated = await prisma.$transaction(async (tx) => {
        // Solo se revalida cuando cambia el horario en sí. Validar también al
        // cambiar el estado dejaría trabadas las citas que ya se superponen
        // (era posible crearlas antes de esta validación): no se podrían
        // marcar como atendidas sin reprogramarlas primero.
        const cambiaHorario =
          (scheduledAt !== undefined && scheduledAt.getTime() !== existing.scheduledAt.getTime()) ||
          (durationMin !== undefined && durationMin !== existing.durationMin);
        const nextStatus = status ?? existing.status;
        const ocupaHorario = (BLOCKING_STATUSES as readonly string[]).includes(nextStatus);

        if (cambiaHorario && ocupaHorario) {
          await assertNoOverlap(
            tx,
            scheduledAt ?? existing.scheduledAt,
            durationMin ?? existing.durationMin,
            id,
          );
        }
        return tx.appointment.update({
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
      });

      await recordAudit({
        userId: req.user!.id,
        action: "appointment.update",
        resource: "appointment",
        resourceId: id,
        req,
        metadata:
          diffFields(
            {
              patientId: existing.patientId,
              scheduledAt: existing.scheduledAt.toISOString(),
              durationMin: existing.durationMin,
              type: existing.type,
              status: existing.status,
              reason: existing.reason,
              notes: existing.notes,
            },
            {
              patientId: updated.patientId,
              scheduledAt: updated.scheduledAt.toISOString(),
              durationMin: updated.durationMin,
              type: updated.type,
              status: updated.status,
              reason: updated.reason,
              notes: updated.notes,
            },
          ) ?? undefined,
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
