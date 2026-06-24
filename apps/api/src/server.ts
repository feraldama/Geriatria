/**
 * Construcción de la app Express (sin levantar el servidor).
 * Separar la "factory" del arranque facilita los tests con Supertest.
 */
import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env, corsOrigins } from "./env.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { patientsRouter } from "./routes/patients.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { clinicalRouter } from "./routes/clinical.js";
import { documentsRouter } from "./routes/documents.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";

export function createApp(): Express {
  const app = express();

  // Detrás de un reverse proxy (lo gestiona el operador), confiamos en el
  // primer salto para obtener bien la IP del cliente (rate limit / auditoría).
  app.set("trust proxy", 1);

  // Cabeceras de seguridad.
  app.use(helmet());

  // CORS restringido al dominio del frontend (configurable por env).
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true, // necesario para enviar/recibir la cookie de sesión
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  // Rate limit general de la API.
  const apiLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limit más estricto en login (defensa adicional contra fuerza bruta).
  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: "TOO_MANY_REQUESTS", message: "Demasiados intentos" } },
  });

  // Healthcheck sin prefijo de versión (para el operador / load balancer).
  app.use("/", healthRouter);

  // API versionada.
  const api = express.Router();
  api.use(apiLimiter);
  api.use("/auth/login", loginLimiter);
  api.use("/auth", authRouter);
  api.use("/profile", profileRouter);
  api.use("/patients", patientsRouter);
  // Rutas clínicas anidadas (/patients/:id/consultations|vitals|timeline).
  api.use("/patients", clinicalRouter);
  api.use("/patients", documentsRouter);
  api.use("/appointments", appointmentsRouter);
  api.use("/dashboard", dashboardRouter);
  app.use("/api/v1", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { env };
