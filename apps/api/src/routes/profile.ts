/**
 * Perfil del propio usuario: ver y editar sus datos, foto y preferencias
 * (incluido el tamaño de fuente). No requiere permisos especiales: cada
 * usuario gestiona su propio perfil.
 */
import { Router } from "express";
import { updateProfileSchema, userPreferencesSchema } from "@geriatria/schemas";
import { prisma } from "../lib/prisma.js";
import { toAuthenticatedUser, userInclude } from "../lib/serialize.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { recordAudit } from "../lib/audit.js";

export const profileRouter: Router = Router();

profileRouter.get("/", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

profileRouter.patch(
  "/",
  requireAuth,
  validateBody(updateProfileSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { name, photoUrl, preferences } = req.body as {
        name?: string;
        photoUrl?: string | null;
        preferences?: Record<string, unknown>;
      };

      // Mezclamos las preferencias nuevas con las existentes y normalizamos.
      const current = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { preferences: true },
      });
      const mergedPrefs = userPreferencesSchema.parse({
        ...(current.preferences as object),
        ...(preferences ?? {}),
      });

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(photoUrl !== undefined ? { photoUrl } : {}),
          preferences: mergedPrefs,
        },
        include: userInclude,
      });
      await recordAudit({ userId, action: "profile.update", req });
      res.json({ user: toAuthenticatedUser(updated) });
    } catch (err) {
      next(err);
    }
  },
);
