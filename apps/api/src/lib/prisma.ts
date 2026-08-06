/** Instancia única del cliente de Prisma reutilizada en toda la app. */
import { PrismaClient } from "@prisma/client";
import { env } from "../env.js";

export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
