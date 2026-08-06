/**
 * Validación y tipado de las variables de entorno con Zod.
 * Si falta algo crítico, la app falla al arrancar (mejor que fallar en runtime).
 */
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL de conexión válida"),
  PORT: z.coerce.number().int().positive().default(3027),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  // El flag Secure de la cookie se activa por variable de entorno (HTTPS).
  // Sin valor explícito se deduce del entorno: en producción, siempre.
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? process.env.NODE_ENV === "production" : v === "true")),
  // Confiar en X-Forwarded-For solo detrás de un reverse proxy. Si se activa sin
  // proxy delante, cualquiera puede falsear su IP y saltarse el rate limit.
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  CORS_ORIGIN: z.string().default("http://localhost:3028"),
  // Directorio base para archivos subidos (documentos clínicos). El operador
  // puede apuntarlo a un volumen persistente; la capa de almacenamiento está
  // abstraída para migrar a S3/compatible más adelante.
  STORAGE_DIR: z.string().default("./storage"),
  // Tamaño máximo de archivo subido, en MB.
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(25),
  // Credenciales del administrador inicial. Solo las usa el seed, que exige
  // ADMIN_PASSWORD y valida su longitud: acá no se le pone default a propósito
  // (uno conocido sería una puerta abierta a la historia clínica de todos los
  // pacientes) ni se valida el largo, para no bloquear el arranque de la API
  // por una variable que la API no usa.
  ADMIN_EMAIL: z.string().email().default("admin@geriatria.local"),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().default("Administrador"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === "production" && !env.TRUST_PROXY) {
  console.warn(
    "⚠️  TRUST_PROXY=false en producción: si hay un reverse proxy delante, " +
      "el rate limit y la auditoría registrarán la IP del proxy, no la del cliente.",
  );
}

/** Lista de orígenes permitidos por CORS (separados por coma). */
export const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
