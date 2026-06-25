/**
 * Dashboard: datos de la pantalla de inicio. Por ahora la "agenda de hoy":
 * las citas del día actual con un pequeño resumen por estado.
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  PERMISSIONS,
  getScaleDefinition,
  type AppointmentItem,
  type AlertItem,
} from "@geriatria/schemas";
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

// GET /dashboard/alerts → panel de alertas: vacunas/controles vencidos o
// próximos (≤30 días) y escalas que empeoran (última vs anterior).
dashboardRouter.get(
  "/alerts",
  requirePermission(PERMISSIONS.CLINICAL_READ),
  async (_req, res, next) => {
    try {
      const now = new Date();
      const soon = new Date(now);
      soon.setDate(soon.getDate() + 30);
      const fullName = (p: { firstName: string; lastName: string }) => `${p.lastName}, ${p.firstName}`;

      const alerts: AlertItem[] = [];

      // Próximas dosis de vacuna (vencidas o dentro de 30 días).
      const vaccines = await prisma.vaccination.findMany({
        where: { deletedAt: null, nextDoseDate: { not: null, lte: soon } },
        include: { patient: { select: { id: true, firstName: true, lastName: true, deletedAt: true } } },
        orderBy: { nextDoseDate: "asc" },
      });
      for (const v of vaccines) {
        if (v.patient.deletedAt) continue;
        const overdue = v.nextDoseDate! < now;
        alerts.push({
          kind: "vaccine",
          severity: overdue ? "bad" : "warning",
          patientId: v.patient.id,
          patientName: fullName(v.patient),
          message: `${overdue ? "Dosis vencida" : "Próxima dosis"}: ${v.vaccine}`,
          date: v.nextDoseDate!.toISOString(),
        });
      }

      // Próximos controles del plan de cuidados (vencidos o dentro de 30 días).
      const plans = await prisma.carePlan.findMany({
        where: { nextControlDate: { not: null, lte: soon } },
        include: { patient: { select: { id: true, firstName: true, lastName: true, deletedAt: true } } },
        orderBy: { nextControlDate: "asc" },
      });
      for (const c of plans) {
        if (c.patient.deletedAt) continue;
        const overdue = c.nextControlDate! < now;
        alerts.push({
          kind: "control",
          severity: overdue ? "bad" : "warning",
          patientId: c.patient.id,
          patientName: fullName(c.patient),
          message: overdue ? "Control vencido" : "Control próximo",
          date: c.nextControlDate!.toISOString(),
        });
      }

      // Escalas que empeoran: última vs anterior del mismo tipo y paciente.
      const scales = await prisma.assessmentScale.findMany({
        where: { deletedAt: null },
        include: { patient: { select: { id: true, firstName: true, lastName: true, deletedAt: true } } },
        orderBy: { appliedAt: "desc" },
      });
      const seen = new Set<string>(); // "patientId:type" ya alertado
      // Las dos puntuaciones más recientes por (paciente, tipo). Como `scales`
      // viene en orden descendente, las primeras dos son la última y la anterior.
      const latestTwo = new Map<string, number[]>();
      for (const s of scales) {
        const key = `${s.patientId}:${s.type}`;
        const arr = latestTwo.get(key) ?? [];
        if (arr.length < 2) arr.push(s.score);
        latestTwo.set(key, arr);
      }
      for (const s of scales) {
        const key = `${s.patientId}:${s.type}`;
        if (seen.has(key) || s.patient.deletedAt) continue;
        const arr = latestTwo.get(key)!;
        if (arr.length < 2) continue;
        seen.add(key);
        const def = getScaleDefinition(s.type);
        if (!def) continue;
        const [latest, previous] = arr; // [más reciente, anterior]
        const worse = def.betterWhenHigher ? latest! < previous! : latest! > previous!;
        if (worse) {
          alerts.push({
            kind: "scale",
            severity: "warning",
            patientId: s.patient.id,
            patientName: fullName(s.patient),
            message: `${def.name} empeoró (${previous} → ${latest})`,
            date: s.appliedAt.toISOString(),
          });
        }
      }

      // Vencidos primero, luego por fecha.
      alerts.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === "bad" ? -1 : 1;
        return (a.date ?? "").localeCompare(b.date ?? "");
      });

      res.json({ data: alerts });
    } catch (err) {
      next(err);
    }
  },
);
