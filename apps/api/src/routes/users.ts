/**
 * Gestión de usuarios (Fase 7). Requiere el permiso user:manage.
 * Alta, edición, desactivación (soft delete) y restablecimiento de contraseña.
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  PERMISSIONS,
  type Paginated,
  type UserListItem,
} from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { validateBody } from "../middleware/validate.js";
import { recordAudit } from "../lib/audit.js";
import { badRequest, notFound, HttpError } from "../lib/errors.js";

export const usersRouter: Router = Router();
usersRouter.use(requireAuth, requirePermission(PERMISSIONS.USER_MANAGE));

function serialize(u: {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: Date | null;
  role: { id: string; name: string };
}): UserListItem {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    active: u.active,
    role: { id: u.role.id, name: u.role.name },
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  };
}

const include = { role: { select: { id: true, name: true } } } satisfies Prisma.UserInclude;

// GET /users?q=&page=&pageSize=
usersRouter.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const dir: "asc" | "desc" = req.query.sortDir === "desc" ? "desc" : "asc";
    const orderBy: Prisma.UserOrderByWithRelationInput =
      req.query.sortBy === "email"
        ? { email: dir }
        : req.query.sortBy === "lastLoginAt"
          ? { lastLoginAt: dir }
          : { name: dir };

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, include, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const result: Paginated<UserListItem> = {
      data: users.map(serialize),
      total,
      page,
      pageSize,
    };
    res.json(result);
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: String(req.params.id), deletedAt: null },
      include,
    });
    if (!user) throw notFound("Usuario no encontrado");
    res.json({ user: serialize(user) });
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/", validateBody(createUserSchema), async (req, res, next) => {
  try {
    const { name, email, password, roleId, active } = req.body;
    const role = await prisma.role.findFirst({ where: { id: roleId, deletedAt: null } });
    if (!role) throw badRequest("El rol indicado no existe");

    const created = await prisma.user
      .create({
        data: {
          name,
          email,
          passwordHash: await hashPassword(password),
          roleId,
          active,
          createdById: req.user!.id,
          preferences: { fontSize: "md" },
        },
        include,
      })
      .catch((e) => {
        // Email duplicado (unique).
        if ((e as { code?: string }).code === "P2002") throw badRequest("Ese correo ya está registrado");
        throw e;
      });
    await recordAudit({
      userId: req.user!.id,
      action: "user.create",
      resource: "user",
      resourceId: created.id,
      req,
    });
    res.status(201).json({ user: serialize(created) });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch("/:id", validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound("Usuario no encontrado");

    const { name, email, roleId, active } = req.body;
    // No permitir que un usuario se desactive ni cambie su propio rol a sí
    // mismo (evita el auto-bloqueo: quedar sin permisos de administración).
    if (id === req.user!.id) {
      if (active === false) throw badRequest("No podés desactivar tu propia cuenta");
      if (roleId && roleId !== existing.roleId) {
        throw badRequest("No podés cambiar tu propio rol");
      }
    }
    if (roleId) {
      const role = await prisma.role.findFirst({ where: { id: roleId, deletedAt: null } });
      if (!role) throw badRequest("El rol indicado no existe");
    }

    const updated = await prisma.user
      .update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(roleId !== undefined ? { roleId } : {}),
          ...(active !== undefined ? { active } : {}),
        },
        include,
      })
      .catch((e) => {
        if ((e as { code?: string }).code === "P2002") throw badRequest("Ese correo ya está registrado");
        throw e;
      });
    await recordAudit({
      userId: req.user!.id,
      action: "user.update",
      resource: "user",
      resourceId: id,
      req,
    });
    res.json({ user: serialize(updated) });
  } catch (err) {
    next(err);
  }
});

// Desactivación (soft delete): nunca borrado físico.
usersRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (id === req.user!.id) throw badRequest("No podés eliminar tu propia cuenta");
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound("Usuario no encontrado");

    await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    await recordAudit({
      userId: req.user!.id,
      action: "user.delete",
      resource: "user",
      resourceId: id,
      req,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Restablecer contraseña (el admin define una nueva).
usersRouter.post(
  "/:id/reset-password",
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw notFound("Usuario no encontrado");

      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: await hashPassword(req.body.newPassword),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await recordAudit({
        userId: req.user!.id,
        action: "user.reset_password",
        resource: "user",
        resourceId: id,
        req,
      });
      res.json({ ok: true });
    } catch (err) {
      // HttpError ya tiene su forma; el resto va al manejador central.
      if (err instanceof HttpError) return next(err);
      next(err);
    }
  },
);
