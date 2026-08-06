/**
 * Regenera el cliente de Prisma después de instalar dependencias.
 *
 * Se salta en silencio cuando no hay nada que generar. Es necesario porque el
 * build de Docker instala las dependencias en una etapa que todavía no copió
 * `prisma/schema.prisma` (para aprovechar la caché de capas), y en la etapa de
 * runtime instala con `--prod`, donde el CLI de Prisma ni siquiera existe. Un
 * `prisma generate` a secas rompería el build en ambos casos.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = resolve(apiRoot, "prisma", "schema.prisma");

if (!existsSync(schema)) {
  console.log("• Sin prisma/schema.prisma: se omite prisma generate.");
  process.exit(0);
}

// Resolvemos el binario en lugar de invocar `prisma` por la shell: con shell
// un comando inexistente devuelve un exit 1 indistinguible de un fallo real.
const require = createRequire(import.meta.url);
let binPath;
try {
  const pkgPath = require.resolve("prisma/package.json", { paths: [apiRoot] });
  const pkg = require(pkgPath);
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.prisma;
  if (!bin) throw new Error("El paquete prisma no declara un binario");
  binPath = resolve(dirname(pkgPath), bin);
} catch {
  console.log("• CLI de Prisma no instalado (instalación de producción): se omite.");
  process.exit(0);
}

const result = spawnSync(process.execPath, [binPath, "generate"], {
  cwd: apiRoot,
  stdio: "inherit",
});

// Best-effort: instalar no debe fallar por esto. En Windows, `generate` da
// EPERM si hay un servidor de desarrollo con el motor de consultas abierto, y
// bloquear cada `pnpm install`/`pnpm add` por eso sería insoportable. La
// generación que sí es obligatoria ocurre en `build` y en el CI, que fallan
// ruidosamente si el cliente quedó desactualizado.
if (result.status !== 0) {
  console.warn(
    "⚠️  No se pudo regenerar el cliente de Prisma. " +
      "Si hay un servidor de desarrollo corriendo, detenelo y ejecutá `pnpm db:generate`.",
  );
}
process.exit(0);
