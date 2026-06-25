/** Vista del registro de auditoría (Fase 7). Requiere el permiso audit:read. */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { PERMISSIONS, type Paginated, type AuditLogItem } from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

export const auditRouter: Router = Router();
auditRouter.use(requireAuth, requirePermission(PERMISSIONS.AUDIT_READ));

// GET /audit?q=&action=&page=&pageSize=
auditRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 30));
    const action = String(req.query.action ?? "").trim();
    const dir: "asc" | "desc" = req.query.sortDir === "asc" ? "asc" : "desc";
    const orderBy: Prisma.AuditLogOrderByWithRelationInput =
      req.query.sortBy === "action" ? { action: dir } : { createdAt: dir };

    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const result: Paginated<AuditLogItem> = {
      data: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        user: l.user ? { id: l.user.id, name: l.user.name, email: l.user.email } : null,
        ipAddress: l.ipAddress,
        metadata: (l.metadata as Record<string, unknown> | null) ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
    res.json(result);
  } catch (err) {
    next(err);
  }
});
