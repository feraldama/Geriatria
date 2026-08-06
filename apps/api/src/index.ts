/** Punto de entrada: levanta el servidor HTTP. */
import { createApp, env } from "./server.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

// Escuchamos en 0.0.0.0 para aceptar conexiones externas (no solo locales),
// de modo que el frontend pueda llegar a la API desde otra máquina/IP.
const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`🩺 API de Geriatría escuchando en http://0.0.0.0:${env.PORT}`);
  console.log(`   Healthcheck: http://0.0.0.0:${env.PORT}/health`);
});

// Cierre ordenado: dejamos terminar las peticiones en vuelo (una consulta a
// medio guardar) antes de soltar la conexión a la base.
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function shutdown(signal: string) {
  console.log(`\n${signal} recibido, cerrando...`);
  await new Promise<void>((resolve) => {
    const forced = setTimeout(() => {
      console.warn("   Peticiones en vuelo demoraron demasiado; se cierra igual.");
      resolve();
    }, SHUTDOWN_TIMEOUT_MS);
    server.close(() => {
      clearTimeout(forced);
      resolve();
    });
  });
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
