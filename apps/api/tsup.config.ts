import { defineConfig } from "tsup";

// Empaquetamos el backend a un único bundle CJS para `start` en producción.
// En desarrollo se usa `tsx watch` (no pasa por acá).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node20",
  platform: "node",
  clean: true,
  sourcemap: true,
  // El cliente de Prisma se resuelve en runtime; no lo empaquetamos.
  external: ["@prisma/client", ".prisma"],
});
