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
import { badRequest, forbidden, notFound } from "../lib/errors.js";

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
// Va en una transacción: si el createMany fallara, un rol podría quedar sin
// ningún permiso (incluido el de administración) y bloquear el sistema.
async function setRolePermissions(
  tx: Prisma.TransactionClient,
  roleId: string,
  actions: string[],
) {
  const perms = await tx.permission.findMany({ where: { action: { in: actions } } });
  if (perms.length !== new Set(actions).size) {
    throw badRequest("Una o más acciones de permiso no existen");
  }
  await tx.rolePermission.deleteMany({ where: { roleId } });
  if (perms.length) {
    await tx.rolePermission.createMany({
      data: perms.map((p) => ({ roleId, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

/** Traduce el error de nombre duplicado de Prisma a un 400 legible. */
function asDuplicateNameError(e: unknown): never {
  if ((e as { code?: string }).code === "P2002") throw badRequest("Ya existe un rol con ese nombre");
  throw e;
}

/**
 * Impide la escalada de privilegios: nadie puede otorgar a un rol permisos que
 * él mismo no posee (si no, cualquiera con role:manage se vuelve superusuario).
 */
function assertCanGrant(actorPermissions: string[], actions: string[]) {
  const granted = new Set(actorPermissions);
  const escalating = actions.filter((a) => !granted.has(a));
  if (escalating.length > 0) {
    throw forbidden(`No podés otorgar permisos que no tenés: ${escalating.join(", ")}`);
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
    assertCanGrant(req.user!.permissions, permissions);

    // Crear el rol y asignarle sus permisos es una sola operación lógica.
    const full = await prisma
      .$transaction(async (tx) => {
        const role = await tx.role.create({ data: { name, description, isSystem: false } });
        await setRolePermissions(tx, role.id, permissions);
        return tx.role.findUniqueOrThrow({ where: { id: role.id }, include });
      })
      .catch(asDuplicateNameError);

    await recordAudit({
      userId: req.user!.id,
      action: "role.create",
      resource: "role",
      resourceId: full.id,
      req,
      metadata: { after: { name: full.name, description: full.description, permissions } },
    });
    res.status(201).json({ role: serialize(full) });
  } catch (err) {
    next(err);
  }
});

rolesRouter.patch("/:id", validateBody(updateRoleSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.role.findFirst({ where: { id, deletedAt: null }, include });
    if (!existing) throw notFound("Rol no encontrado");

    const { name, description, permissions } = req.body;

    // Los roles del sistema son la base del RBAC: renombrarlos o vaciarles los
    // permisos dejaría la instalación sin nadie capaz de administrarla.
    if (existing.isSystem && (name !== undefined || permissions !== undefined)) {
      throw forbidden("Los roles del sistema no permiten cambiar su nombre ni sus permisos");
    }
    // Nadie edita el rol al que pertenece: sería auto-otorgarse permisos.
    if (id === req.user!.role.id && permissions !== undefined) {
      throw forbidden("No podés modificar los permisos de tu propio rol");
    }
    if (permissions !== undefined) assertCanGrant(req.user!.permissions, permissions);

    const before = serialize(existing);
    const full = await prisma
      .$transaction(async (tx) => {
        await tx.role.update({
          where: { id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
          },
        });
        if (permissions !== undefined) await setRolePermissions(tx, id, permissions);
        return tx.role.findUniqueOrThrow({ where: { id }, include });
      })
      .catch(asDuplicateNameError);

    await recordAudit({
      userId: req.user!.id,
      action: "role.update",
      resource: "role",
      resourceId: id,
      req,
      metadata: { before, after: serialize(full) },
    });
    res.json({ role: serialize(full) });
  } catch (err) {
    next(err);
  }
});
