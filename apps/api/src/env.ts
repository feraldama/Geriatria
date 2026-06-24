/**
 * Validación y tipado de las variables de entorno con Zod.
 * Si falta algo crítico, la app falla al arrancar (mejor que fallar en runtime).
 */
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL de conexión válida"),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  // El flag Secure de la cookie se activa por variable de entorno (HTTPS).
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().email().default("admin@geriatria.local"),
  ADMIN_PASSWORD: z.string().min(8).default("Admin12345"),
  ADMIN_NAME: z.string().default("Administrador"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

/** Lista de orígenes permitidos por CORS (separados por coma). */
export const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
