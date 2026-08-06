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
import { usersRouter } from "./routes/users.js";
import { rolesRouter, permissionsRouter } from "./routes/roles.js";
import { auditRouter } from "./routes/audit.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";

export function createApp(): Express {
  const app = express();

  // Solo confiamos en X-Forwarded-For si hay un reverse proxy delante. Con
  // trust proxy activo sin proxy real, cualquier cliente puede falsear su IP y
  // saltarse el rate limit o envenenar el campo ipAddress de la auditoría.
  app.set("trust proxy", env.TRUST_PROXY ? 1 : false);

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

  // Cambio y restablecimiento de contraseña: operaciones sensibles que no
  // deberían poder repetirse cientos de veces dentro del límite general.
  const passwordLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
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
  api.use("/auth/password", passwordLimiter);
  api.use(/^\/users\/[^/]+\/reset-password$/, passwordLimiter);
  api.use("/auth", authRouter);
  api.use("/profile", profileRouter);
  api.use("/patients", patientsRouter);
  // Rutas clínicas anidadas (/patients/:id/consultations|vitals|timeline).
  api.use("/patients", clinicalRouter);
  api.use("/patients", documentsRouter);
  api.use("/appointments", appointmentsRouter);
  api.use("/dashboard", dashboardRouter);
  api.use("/users", usersRouter);
  api.use("/roles", rolesRouter);
  api.use("/permissions", permissionsRouter);
  api.use("/audit", auditRouter);
  app.use("/api/v1", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { env };
