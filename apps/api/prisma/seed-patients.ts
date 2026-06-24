/**
 * Seed de pacientes FICTICIOS para desarrollo/demostración.
 * Datos inventados; nunca usar datos reales de pacientes.
 * Idempotente por documentId.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PACIENTES = [
  {
    firstName: "María",
    lastName: "González",
    documentId: "1234567",
    birthDate: new Date("1942-03-15"),
    sex: "FEMENINO" as const,
    maritalStatus: "VIUDO" as const,
    phone: "0981-111222",
    address: "Av. España 123, Asunción",
    dependencyLevel: "LEVE" as const,
    livesWith: "Hija",
    smoking: "NUNCA" as const,
    alcohol: "NUNCA" as const,
    medicalHistory: "Hipertensión arterial, artrosis de rodilla.",
    caregivers: [
      { name: "Laura González", relationship: "Hija", phone: "0982-333444", livesWith: true, isPrimary: true },
    ],
    conditions: [
      { name: "Hipertensión arterial", active: true },
      { name: "Artrosis de rodilla", active: true },
    ],
    allergies: [{ substance: "Penicilina", reaction: "Urticaria", severity: "MODERADA" as const }],
  },
  {
    firstName: "José",
    lastName: "Martínez",
    documentId: "2345678",
    birthDate: new Date("1938-07-22"),
    sex: "MASCULINO" as const,
    maritalStatus: "CASADO" as const,
    phone: "0971-555666",
    address: "Calle Palma 456, Asunción",
    dependencyLevel: "MODERADA" as const,
    livesWith: "Esposa",
    smoking: "EX" as const,
    alcohol: "NUNCA" as const,
    medicalHistory: "Diabetes tipo 2, EPOC.",
    caregivers: [
      { name: "Carmen de Martínez", relationship: "Esposa", phone: "0971-555667", livesWith: true, isPrimary: true },
    ],
    conditions: [
      { name: "Diabetes mellitus tipo 2", active: true },
      { name: "EPOC", active: true },
    ],
    allergies: [],
  },
  {
    firstName: "Rosa",
    lastName: "Benítez",
    documentId: "3456789",
    birthDate: new Date("1950-11-05"),
    sex: "FEMENINO" as const,
    maritalStatus: "SOLTERO" as const,
    phone: "0985-777888",
    dependencyLevel: "INDEPENDIENTE" as const,
    livesWith: "Sola",
    conditions: [{ name: "Hipotiroidismo", active: true }],
    allergies: [
      { substance: "AINEs", reaction: "Broncoespasmo", severity: "SEVERA" as const },
      { substance: "Mariscos", severity: "LEVE" as const },
    ],
    caregivers: [],
  },
];

async function main() {
  console.log("🌱 Sembrando pacientes ficticios (solo desarrollo)...");
  const admin = await prisma.user.findFirst({ where: { email: { contains: "admin" } } });

  for (const data of PACIENTES) {
    const exists = await prisma.patient.findFirst({ where: { documentId: data.documentId } });
    if (exists) {
      console.log(`   • ${data.lastName}, ${data.firstName} ya existe; se omite.`);
      continue;
    }
    const { caregivers, conditions, allergies, ...core } = data;
    await prisma.patient.create({
      data: {
        ...core,
        createdById: admin?.id,
        caregivers: { create: caregivers },
        conditions: { create: conditions },
        allergies: { create: allergies },
      },
    });
    console.log(`   ✓ ${data.lastName}, ${data.firstName}`);
  }
  console.log("✅ Pacientes de prueba listos.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
