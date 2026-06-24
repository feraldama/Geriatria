/** Healthcheck: verifica que la API responde y que la base de datos contesta. */
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter: Router = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "up", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "down" });
  }
});
