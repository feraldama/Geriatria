/**
 * Middleware de control de acceso por roles (RBAC).
 *
 * El backend es la fuente de verdad: cada endpoint declara el permiso que
 * requiere y este middleware lo valida ANTES de ejecutar el handler. El
 * frontend oculta/deshabilita acciones, pero nunca se confía solo en él.
 */
import type { NextFunction, Request, Response } from "express";
import type { PermissionAction } from "@geriatria/schemas";
import { forbidden, unauthorized } from "../lib/errors.js";

/** Exige que el usuario autenticado tenga TODOS los permisos indicados. */
export function requirePermission(...required: PermissionAction[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    const granted = new Set(req.user.permissions);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      return next(forbidden(`Falta el permiso: ${missing.join(", ")}`));
    }
    next();
  };
}
