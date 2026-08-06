/**
 * Dashboard: datos de la pantalla de inicio. Por ahora la "agenda de hoy":
 * las citas del día actual con un pequeño resumen por estado.
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  PERMISSIONS,
  getScaleDefinition,
  SCALE_DEFINITIONS,
  clinicStartOfDay,
  clinicEndOfDay,
  type AppointmentItem,
  type AlertItem,
} from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

export const dashboardRouter: Router = Router();
dashboardRouter.use(requireAuth);

// Tope por tipo de alerta: el panel es un resumen, no un listado exhaustivo.
const MAX_ALERTS_PER_KIND = 100;

// Tipos de escala según en qué dirección significa "peor". Se derivan del
// catálogo para que agregar una escala no requiera tocar el SQL.
const higherIsBetter = Object.entries(SCALE_DEFINITIONS)
  .filter(([, def]) => def.betterWhenHigher)
  .map(([type]) => type);
const lowerIsBetter = Object.entries(SCALE_DEFINITIONS)
  .filter(([, def]) => !def.betterWhenHigher)
  .map(([type]) => type);

/** Fila del cálculo de tendencia de escalas (última vs anterior). */
interface ScaleTrendRow {
  patientId: string;
  firstName: string;
  lastName: string;
  type: string;
  latestScore: number;
  latestAt: Date;
  previousScore: number;
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

// GET /dashboard/today  → citas de hoy + resumen por estado.
dashboardRouter.get(
  "/today",
  requirePermission(PERMISSIONS.APPOINTMENT_READ),
  async (_req, res, next) => {
    try {
      // "Hoy" es el día de la clínica, no el del servidor ni el del navegador.
      const start = clinicStartOfDay(new Date());
      const end = clinicEndOfDay(new Date());

      const appointments = await prisma.appointment.findMany({
        where: {
          deletedAt: null,
          scheduledAt: { gte: start, lt: end },
          patient: { deletedAt: null },
        },
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
        // El filtro por paciente vigente va en la consulta, no en JS: así la
        // base no trae filas que después se descartan.
        where: {
          deletedAt: null,
          nextDoseDate: { not: null, lte: soon },
          patient: { deletedAt: null },
        },
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { nextDoseDate: "asc" },
        take: MAX_ALERTS_PER_KIND,
      });
      for (const v of vaccines) {
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
        where: {
          deletedAt: null,
          nextControlDate: { not: null, lte: soon },
          patient: { deletedAt: null },
        },
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { nextControlDate: "asc" },
        take: MAX_ALERTS_PER_KIND,
      });
      for (const c of plans) {
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
      //
      // Se resuelve en SQL con una window function. La versión anterior traía
      // TODAS las escalas de TODOS los pacientes a memoria en cada carga del
      // dashboard: un scan completo de la tabla y de datos clínicos por cada
      // visita a la pantalla de inicio.
      // El sentido de "empeoró" depende de cada escala (en Barthel baja, en
      // Yesavage sube), y eso vive en el catálogo del código. Se pasan los dos
      // grupos como parámetros para que el filtro —y por lo tanto el LIMIT—
      // ocurran en SQL: si se filtrara después en JS, el tope recortaría
      // candidatos y dejaría fuera alertas reales de pacientes evaluados hace
      // más tiempo.
      const pairs = await prisma.$queryRaw<ScaleTrendRow[]>`
        WITH ranked AS (
          SELECT
            s."patientId",
            s."type",
            s."score",
            s."appliedAt",
            ROW_NUMBER() OVER (
              PARTITION BY s."patientId", s."type" ORDER BY s."appliedAt" DESC, s."id" DESC
            ) AS rn
          FROM "AssessmentScale" s
          JOIN "Patient" p ON p."id" = s."patientId"
          WHERE s."deletedAt" IS NULL AND p."deletedAt" IS NULL
        )
        SELECT
          r."patientId",
          p."firstName",
          p."lastName",
          r."type",
          r."score"     AS "latestScore",
          r."appliedAt" AS "latestAt",
          prev."score"  AS "previousScore"
        FROM ranked r
        JOIN ranked prev
          ON prev."patientId" = r."patientId" AND prev."type" = r."type" AND prev.rn = 2
        JOIN "Patient" p ON p."id" = r."patientId"
        WHERE r.rn = 1
          AND (
            (r."type" = ANY(${higherIsBetter}::text[]) AND r."score" < prev."score")
            OR (r."type" = ANY(${lowerIsBetter}::text[]) AND r."score" > prev."score")
          )
        ORDER BY r."appliedAt" DESC
        LIMIT ${MAX_ALERTS_PER_KIND}
      `;

      for (const row of pairs) {
        const def = getScaleDefinition(row.type);
        if (!def) continue;
        alerts.push({
          kind: "scale",
          severity: "warning",
          patientId: row.patientId,
          patientName: fullName(row),
          message: `${def.name} empeoró (${row.previousScore} → ${row.latestScore})`,
          date: row.latestAt.toISOString(),
        });
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
