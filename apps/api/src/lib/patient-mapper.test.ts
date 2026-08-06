/**
 * Tests de la reconciliación de las colecciones del paciente (cuidadores,
 * condiciones, alergias).
 *
 * La propiedad clave es que sea **idempotente**: guardar el mismo formulario
 * dos veces tiene que dejar exactamente las mismas filas. Una versión anterior
 * agregaba una fila en cada guardado cuando había nombres repetidos, y esos
 * duplicados quedaban imposibles de borrar desde la interfaz.
 */
import { describe, it, expect } from "vitest";
import { reconcile, normalizeSearch } from "./patient-mapper.js";

interface Fila {
  id: string;
  substance: string;
}
interface Entrada {
  substance: string;
}

/** Ejecuta reconcile sobre un conjunto de filas en memoria y devuelve el estado final. */
async function correr(current: Fila[], incoming: Entrada[]) {
  const filas = new Map(current.map((r) => [r.id, { ...r }]));
  const creadas: Entrada[] = [];
  const eliminadas: string[] = [];
  const actualizadas: string[] = [];
  let siguienteId = current.length + 1;

  await reconcile<Fila, Entrada>({
    current,
    incoming,
    keyOf: (item) => normalizeSearch(item.substance),
    remove: async (ids) => {
      for (const id of ids) {
        filas.delete(id);
        eliminadas.push(id);
      }
    },
    update: async (id, item) => {
      actualizadas.push(id);
      filas.set(id, { id, substance: item.substance });
    },
    create: async (items) => {
      for (const item of items) {
        const id = `nuevo-${siguienteId++}`;
        filas.set(id, { id, substance: item.substance });
        creadas.push(item);
      }
    },
  });

  return {
    finales: [...filas.values()],
    creadas: creadas.length,
    eliminadas,
    actualizadas,
  };
}

describe("reconcile", () => {
  it("conserva el id de lo que sigue presente", async () => {
    const r = await correr([{ id: "a1", substance: "Penicilina" }], [{ substance: "Penicilina" }]);
    expect(r.finales).toEqual([{ id: "a1", substance: "Penicilina" }]);
    expect(r.creadas).toBe(0);
    expect(r.eliminadas).toEqual([]);
  });

  it("empareja ignorando mayúsculas y acentos", async () => {
    const r = await correr([{ id: "a1", substance: "Penicilina" }], [{ substance: "PENICILINA" }]);
    expect(r.finales).toHaveLength(1);
    expect(r.finales[0]!.id).toBe("a1");
    expect(r.eliminadas).toEqual([]);
  });

  it("da de baja lógica lo que se quitó, sin borrarlo físicamente", async () => {
    const r = await correr(
      [
        { id: "a1", substance: "Penicilina" },
        { id: "a2", substance: "Sulfas" },
      ],
      [{ substance: "Penicilina" }],
    );
    expect(r.eliminadas).toEqual(["a2"]);
    expect(r.finales.map((f) => f.id)).toEqual(["a1"]);
  });

  it("crea lo que no existía", async () => {
    const r = await correr([], [{ substance: "Penicilina" }, { substance: "Sulfas" }]);
    expect(r.creadas).toBe(2);
    expect(r.finales).toHaveLength(2);
  });

  // ─── Regresiones ────────────────────────────────────────────────────────

  it("no multiplica filas cuando el formulario manda la misma sustancia dos veces", async () => {
    const r = await correr(
      [{ id: "a1", substance: "Penicilina" }],
      [{ substance: "Penicilina" }, { substance: "penicilina" }],
    );
    expect(r.finales).toHaveLength(1);
    expect(r.creadas).toBe(0);
  });

  it("guardar el mismo payload repetidas veces es idempotente", async () => {
    let filas: Fila[] = [{ id: "a1", substance: "Penicilina" }];
    const payload = [{ substance: "Penicilina" }, { substance: "penicilina" }];

    for (let i = 0; i < 3; i++) {
      const r = await correr(filas, payload);
      filas = r.finales;
      expect(filas).toHaveLength(1);
    }
  });

  it("limpia los duplicados que ya estaban en la base", async () => {
    const r = await correr(
      [
        { id: "a1", substance: "Penicilina" },
        { id: "a2", substance: "penicilina" },
      ],
      [{ substance: "Penicilina" }],
    );
    // Se conserva una sola fila y la sobrante queda dada de baja.
    expect(r.finales).toHaveLength(1);
    expect(r.eliminadas).toEqual(["a2"]);
  });

  it("permite quitar un duplicado preexistente desde el formulario", async () => {
    const r = await correr(
      [
        { id: "a1", substance: "Penicilina" },
        { id: "a2", substance: "Penicilina" },
      ],
      [],
    );
    expect(r.finales).toEqual([]);
    expect(r.eliminadas.sort()).toEqual(["a1", "a2"]);
  });

  it("una lista vacía da de baja todo", async () => {
    const r = await correr([{ id: "a1", substance: "Penicilina" }], []);
    expect(r.finales).toEqual([]);
    expect(r.eliminadas).toEqual(["a1"]);
  });
});
