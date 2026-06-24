/** Punto de entrada: levanta el servidor HTTP. */
import { createApp, env } from "./server.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🩺 API de Geriatría escuchando en http://localhost:${env.PORT}`);
  console.log(`   Healthcheck: http://localhost:${env.PORT}/health`);
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
