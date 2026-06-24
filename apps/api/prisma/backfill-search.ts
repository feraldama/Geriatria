/**
 * Rellena el campo searchText de pacientes existentes (uso único tras agregar
 * la columna). Recalcula nombre + apellido + documento normalizados.
 */
import { PrismaClient } from "@prisma/client";
import { normalizeSearch } from "../src/lib/patient-mapper.js";

const prisma = new PrismaClient();

async function main() {
  const patients = await prisma.patient.findMany({
    select: { id: true, firstName: true, lastName: true, documentId: true },
  });
  for (const p of patients) {
    const searchText = normalizeSearch(
      [p.firstName, p.lastName, p.documentId].filter(Boolean).join(" "),
    );
    await prisma.patient.update({ where: { id: p.id }, data: { searchText } });
  }
  console.log(`✅ searchText recalculado para ${patients.length} pacientes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
