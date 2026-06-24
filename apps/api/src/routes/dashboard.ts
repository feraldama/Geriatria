/**
 * Dashboard: datos de la pantalla de inicio. Por ahora la "agenda de hoy":
 * las citas del día actual con un pequeño resumen por estado.
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { PERMISSIONS, type AppointmentItem } from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

export const dashboardRouter: Router = Router();
dashboardRouter.use(requireAuth);

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

// GET /dashboard/today  → citas de hoy + resumen por estado.
dashboardRouter.get(
  "/today",
  requirePermission(PERMISSIONS.APPOINTMENT_READ),
  async (_req, res, next) => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const appointments = await prisma.appointment.findMany({
        where: { deletedAt: null, scheduledAt: { gte: start, lt: end } },
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { scheduledAt: "asc" },
      });

      // Resumen por estado para mostrar de un vistazo.
      const summary = appointments.reduce<Record<string, number>>((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      }, {});

      res.json({
        date: start.toISOString(),
        total: appointments.length,
        summary,
        appointments: appointments.map(serialize),
      });
    } catch (err) {
      next(err);
    }
  },
);
