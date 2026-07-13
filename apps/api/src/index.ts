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

// Cierre ordenado: desconectamos Prisma al recibir señales de terminación.
async function shutdown(signal: string) {
  console.log(`\n${signal} recibido, cerrando...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
