/**
 * Gestión de roles y catálogo de permisos (Fase 7).
 * Roles: requiere role:manage. Los permisos se guardan en BD (editables sin
 * tocar código). Los roles del sistema no se eliminan (no hay endpoint DELETE).
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  roleSchema,
  updateRoleSchema,
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  type RoleItem,
  type PermissionItem,
} from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { validateBody } from "../middleware/validate.js";
import { recordAudit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";

type RoleWithRels = Prisma.RoleGetPayload<{
  include: { permissions: { include: { permission: true } }; _count: { select: { users: true } } };
}>;

function serialize(r: RoleWithRels): RoleItem {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissions: r.permissions.map((rp) => rp.permission.action),
    userCount: r._count.users,
  };
}

const include = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
} satisfies Prisma.RoleInclude;

// Reemplaza el conjunto de permisos de un rol (valida que existan en el catálogo).
async function setRolePermissions(roleId: string, actions: string[]) {
  const perms = await prisma.permission.findMany({ where: { action: { in: actions } } });
  if (perms.length !== new Set(actions).size) {
    throw badRequest("Una o más acciones de permiso no existen");
  }
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (perms.length) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

// ─── Catálogo de permisos ───────────────────────────────────────────────────

export const permissionsRouter: Router = Router();
permissionsRouter.use(requireAuth, requirePermission(PERMISSIONS.ROLE_MANAGE));

permissionsRouter.get("/", async (_req, res, next) => {
  try {
    const perms = await prisma.permission.findMany({ orderBy: { action: "asc" } });
    const data: PermissionItem[] = perms.map((p) => ({
      action: p.action,
      // Descripción legible (del catálogo del código si existe).
      description:
        PERMISSION_DESCRIPTIONS[p.action as keyof typeof PERMISSION_DESCRIPTIONS] ?? p.description,
    }));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── Roles ────────────────────────────────────────────────────────────────────

export const rolesRouter: Router = Router();
rolesRouter.use(requireAuth, requirePermission(PERMISSIONS.ROLE_MANAGE));

rolesRouter.get("/", async (_req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include,
      orderBy: { name: "asc" },
    });
    res.json({ data: roles.map(serialize) });
  } catch (err) {
    next(err);
  }
});

rolesRouter.post("/", validateBody(roleSchema), async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await prisma.role
      .create({ data: { name, description, isSystem: false } })
      .catch((e) => {
        if ((e as { code?: string }).code === "P2002") throw badRequest("Ya existe un rol con ese nombre");
        throw e;
      });
    await setRolePermissions(role.id, permissions);
    const full = await prisma.role.findUniqueOrThrow({ where: { id: role.id }, include });
    await recordAudit({
      userId: req.user!.id,
      action: "role.create",
      resource: "role",
      resourceId: role.id,
      req,
    });
    res.status(201).json({ role: serialize(full) });
  } catch (err) {
    next(err);
  }
});

rolesRouter.patch("/:id", validateBody(updateRoleSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.role.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound("Rol no encontrado");

    const { name, description, permissions } = req.body;
    await prisma.role
      .update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      })
      .catch((e) => {
        if ((e as { code?: string }).code === "P2002") throw badRequest("Ya existe un rol con ese nombre");
        throw e;
      });
    if (permissions !== undefined) await setRolePermissions(id, permissions);

    const full = await prisma.role.findUniqueOrThrow({ where: { id }, include });
    await recordAudit({
      userId: req.user!.id,
      action: "role.update",
      resource: "role",
      resourceId: id,
      req,
    });
    res.json({ role: serialize(full) });
  } catch (err) {
    next(err);
  }
});
