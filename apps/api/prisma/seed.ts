/**
 * Seed inicial: crea los permisos del catálogo, los roles base y el usuario
 * Administrador inicial. Las credenciales del admin vienen de variables de
 * entorno (ADMIN_EMAIL / ADMIN_PASSWORD), NUNCA quemadas en el código.
 *
 * Es idempotente: se puede correr varias veces sin duplicar datos.
 */
import {
  ALL_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  BASE_ROLES,
  BASE_ROLE_PERMISSIONS,
  type BaseRoleName,
} from "@geriatria/schemas";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando permisos, roles y admin inicial...");

  // 1) Permisos del catálogo.
  for (const action of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { action },
      update: { description: PERMISSION_DESCRIPTIONS[action] },
      create: { action, description: PERMISSION_DESCRIPTIONS[action] },
    });
  }
  console.log(`   ✓ ${ALL_PERMISSIONS.length} permisos`);

  // 2) Roles base con sus permisos.
  const roleNames = Object.values(BASE_ROLES) as BaseRoleName[];
  for (const name of roleNames) {
    const permissions = BASE_ROLE_PERMISSIONS[name];
    const role = await prisma.role.upsert({
      where: { name },
      update: { isSystem: true },
      create: { name, isSystem: true, description: `Rol base: ${name}` },
    });

    // Reasignamos el set de permisos del rol (idempotente).
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const perms = await prisma.permission.findMany({
      where: { action: { in: permissions } },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    console.log(`   ✓ Rol "${name}" con ${perms.length} permisos`);
  }

  // 3) Usuario Administrador inicial (credenciales desde env).
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@geriatria.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin12345";
  const adminName = process.env.ADMIN_NAME ?? "Administrador";

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: BASE_ROLES.ADMIN },
  });

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`   • El admin ${adminEmail} ya existe; no se modifica.`);
  } else {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        roleId: adminRole.id,
        preferences: { fontSize: "md" },
      },
    });
    console.log(`   ✓ Admin creado: ${adminEmail}`);
    console.log(`     (cambiá la contraseña tras el primer ingreso)`);
  }

  console.log("✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
