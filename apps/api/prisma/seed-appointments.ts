/**
 * Seed de citas FICTICIAS para desarrollo. Crea algunas citas hoy y en los
 * próximos días para los pacientes de prueba. Idempotente: limpia las citas
 * previas de esos pacientes antes de recrear.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function at(daysFromToday: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Sembrando citas ficticias (solo desarrollo)...");
  const patients = await prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: { lastName: "asc" },
    take: 3,
  });
  if (patients.length === 0) {
    console.log("   ⚠ No hay pacientes. Corré primero db:seed:patients.");
    return;
  }

  const ids = patients.map((p) => p.id);
  await prisma.appointment.deleteMany({ where: { patientId: { in: ids } } });

  const [p1, p2, p3] = patients;
  const data = [
    { patientId: p1!.id, scheduledAt: at(0, 9, 0), durationMin: 30, type: "CONTROL" as const, status: "CONFIRMADA" as const, reason: "Control de presión arterial" },
    { patientId: p2!.id, scheduledAt: at(0, 10, 0), durationMin: 45, type: "PRIMERA_VEZ" as const, status: "PROGRAMADA" as const, reason: "Valoración geriátrica inicial" },
    { patientId: p3!.id, scheduledAt: at(0, 11, 30), durationMin: 30, type: "TELECONSULTA" as const, status: "PROGRAMADA" as const, reason: "Seguimiento de hipotiroidismo" },
    { patientId: p1!.id, scheduledAt: at(1, 8, 30), durationMin: 30, type: "CONTROL" as const, status: "PROGRAMADA" as const },
    { patientId: p2!.id, scheduledAt: at(2, 15, 0), durationMin: 60, type: "DOMICILIARIA" as const, status: "PROGRAMADA" as const, reason: "Visita domiciliaria" },
    { patientId: p3!.id, scheduledAt: at(4, 9, 0), durationMin: 30, type: "CONTROL" as const, status: "PROGRAMADA" as const },
  ];

  await prisma.appointment.createMany({ data });
  console.log(`   ✓ ${data.length} citas creadas (hoy y próximos días).`);
  console.log("✅ Citas de prueba listas.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
