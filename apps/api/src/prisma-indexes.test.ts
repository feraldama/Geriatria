/**
 * Los índices que Prisma no puede expresar viven solo en SQL crudo dentro de
 * una migración. Prisma los considera "de más" y un `prisma migrate dev` genera
 * una migración que los ELIMINA. Este test detecta ese borrado antes de que
 * llegue a producción: sin el índice único de cédula se pueden duplicar
 * historias clínicas, y sin los GIN la búsqueda de pacientes hace scan completo.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

const INDICES_CRUDOS = [
  "Patient_searchText_trgm_idx",
  "Patient_documentId_active_key",
  "User_name_trgm_idx",
  "User_email_trgm_idx",
];

function todasLasMigraciones(): { nombre: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => ({
      nombre: d.name,
      sql: readFileSync(join(MIGRATIONS_DIR, d.name, "migration.sql"), "utf8"),
    }));
}

describe("índices creados con SQL crudo", () => {
  const migraciones = todasLasMigraciones();
  const sqlCompleto = migraciones.map((m) => m.sql).join("\n");

  it("hay migraciones para revisar", () => {
    expect(migraciones.length).toBeGreaterThan(0);
  });

  it.each(INDICES_CRUDOS)("%s se crea en alguna migración", (indice) => {
    expect(sqlCompleto).toMatch(new RegExp(`CREATE (UNIQUE )?INDEX IF NOT EXISTS "${indice}"`));
  });

  it.each(INDICES_CRUDOS)("%s no lo elimina ninguna migración posterior", (indice) => {
    // Si esto falla, `prisma migrate dev` generó un DROP: hay que quitarlo del
    // SQL antes de aplicar la migración.
    const creado = migraciones.findIndex((m) => m.sql.includes(`INDEX IF NOT EXISTS "${indice}"`));
    const borrados = migraciones
      .map((m, i) => ({ ...m, i }))
      .filter(({ sql, i }) => i > creado && new RegExp(`DROP INDEX[^;]*"${indice}"`).test(sql));
    expect(borrados.map((b) => b.nombre)).toEqual([]);
  });

  it("la extensión pg_trgm se habilita antes de usarla", () => {
    expect(sqlCompleto).toContain("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  });
});
