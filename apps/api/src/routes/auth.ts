/**
 * Rutas de autenticación: login, datos del usuario actual, logout y cambio
 * de la propia contraseña. Incluye protección contra fuerza bruta (bloqueo
 * temporal tras varios intentos fallidos) y registro de auditoría de logins.
 */
import { Router } from "express";
import { loginSchema, changePasswordSchema } from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "../lib/jwt.js";
import { toAuthenticatedUser, userInclude } from "../lib/serialize.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { recordAudit } from "../lib/audit.js";
import { unauthorized, badRequest, tooManyRequests } from "../lib/errors.js";

export const authRouter: Router = Router();

// Política de bloqueo por fuerza bruta.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: userInclude,
    });

    // Respuesta genérica para no revelar si el email existe.
    const invalidCredentials = unauthorized("Credenciales inválidas");

    if (!user) {
      await recordAudit({ action: "login.failed", metadata: { email }, req });
      throw invalidCredentials;
    }

    // ¿Cuenta bloqueada temporalmente?
    const lockActive = !!user.lockedUntil && user.lockedUntil > new Date();
    if (lockActive) {
      await recordAudit({ userId: user.id, action: "login.blocked", req });
      throw tooManyRequests(
        `Cuenta bloqueada temporalmente. Intentá de nuevo más tarde.`,
      );
    }

    if (!user.active) {
      await recordAudit({ userId: user.id, action: "login.inactive", req });
      throw invalidCredentials;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      // El incremento lo hace la base, no la aplicación: leer el contador y
      // escribir el valor calculado permitiría evadir el bloqueo lanzando
      // varios intentos en paralelo (todos escribirían "1").
      // Si el bloqueo anterior ya venció, arrancamos de cero para no
      // re-bloquear con un único error posterior.
      const lockExpired = !!user.lockedUntil && user.lockedUntil <= new Date();
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: lockExpired
          ? { failedLoginAttempts: 1, lockedUntil: null }
          : { failedLoginAttempts: { increment: 1 }, lockedUntil: null },
        select: { failedLoginAttempts: true },
      });

      const attempts = updated.failedLoginAttempts;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
      if (shouldLock) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
        });
      }
      await recordAudit({
        userId: user.id,
        action: shouldLock ? "login.locked" : "login.failed",
        metadata: { attempts },
        req,
      });
      throw invalidCredentials;
    }

    // Login correcto: reseteamos contador y registramos.
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await recordAudit({ userId: user.id, action: "login.success", req });

    const token = signSession({ sub: user.id, ver: user.tokenVersion });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.json({ user: toAuthenticatedUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.json({ ok: true });
});

authRouter.patch(
  "/password",
  requireAuth,
  validateBody(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      const userId = req.user!.id;

      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) throw badRequest("La contraseña actual es incorrecta");

      // Subir tokenVersion invalida las sesiones abiertas (incluida la de un
      // atacante que hubiera obtenido la contraseña anterior). Como el propio
      // usuario está cambiándola, le reemitimos la cookie con la nueva versión.
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await hashPassword(newPassword),
          tokenVersion: { increment: 1 },
        },
        select: { tokenVersion: true },
      });
      res.cookie(
        SESSION_COOKIE,
        signSession({ sub: userId, ver: updated.tokenVersion }),
        sessionCookieOptions(),
      );
      await recordAudit({ userId, action: "password.change", req });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
