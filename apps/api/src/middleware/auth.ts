/**
 * Middleware de autenticación: lee la cookie de sesión, verifica el JWT,
 * carga el usuario (con rol y permisos) y lo adjunta a `req.user`.
 */
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { SESSION_COOKIE, verifySession } from "../lib/jwt.js";
import { unauthorized } from "../lib/errors.js";
import { toAuthenticatedUser, userInclude } from "../lib/serialize.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw unauthorized("Sesión no encontrada");

    let payload;
    try {
      payload = verifySession(token);
    } catch {
      throw unauthorized("Sesión inválida o expirada");
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, active: true, deletedAt: null },
      include: userInclude,
    });
    if (!user) throw unauthorized("Usuario no disponible");

    req.user = toAuthenticatedUser(user);
    next();
  } catch (err) {
    next(err);
  }
}
