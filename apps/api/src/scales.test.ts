/**
 * Tests del motor de escalas geriátricas (lógica clínica compartida).
 * Protege el cálculo de puntaje y la interpretación contra regresiones.
 */
import { describe, it, expect } from "vitest";
import {
  getScaleDefinition,
  computeScaleScore,
  scaleMaxScore,
  calculateBMI,
  calculateAge,
  SCALE_TYPES,
} from "@geriatria/schemas";

// Nota: en preguntas de tipo "options" la respuesta es el ÍNDICE de la opción
// elegida (no los puntos). Barthel "Independiente" suele ser el último índice.
describe("computeScaleScore", () => {
  it("suma correctamente el Índice de Barthel", () => {
    const def = getScaleDefinition("BARTHEL")!;
    // Índices que reproducen el puntaje 90 (alimentación=10, baño=5, …).
    const answers = {
      alimentacion: 2, // Independiente (10)
      bano: 1, // Independiente (5)
      aseo: 1, // Independiente (5)
      vestido: 2, // Independiente (10)
      deposiciones: 2, // Continente (10)
      miccion: 2, // Continente (10)
      retrete: 2, // Independiente (10)
      traslado: 3, // Independiente (15)
      deambulacion: 2, // Camina con ayuda (10)
      escaleras: 1, // Necesita ayuda (5)
    };
    expect(computeScaleScore(def, answers)).toBe(90);
  });

  it("rechaza una opción inválida (índice fuera de rango)", () => {
    const def = getScaleDefinition("BARTHEL")!;
    expect(() => computeScaleScore(def, { ...validBarthel(), bano: 5 })).toThrow();
  });

  it("rechaza respuestas faltantes", () => {
    const def = getScaleDefinition("MMSE")!;
    expect(() => computeScaleScore(def, { orientacion_temporal: 5 })).toThrow();
  });

  it("valida el rango de un campo numérico (TUG)", () => {
    const def = getScaleDefinition("TUG")!;
    expect(computeScaleScore(def, { tiempo: 25 })).toBe(25);
    expect(() => computeScaleScore(def, { tiempo: 200 })).toThrow();
  });
});

describe("interpretación clínica", () => {
  it("Barthel: 90 = dependencia leve (bueno)", () => {
    const i = getScaleDefinition("BARTHEL")!.interpret(90);
    expect(i.label).toBe("Dependencia leve");
    expect(i.level).toBe("good");
  });

  it("Yesavage: 12 = depresión severa (malo)", () => {
    const i = getScaleDefinition("YESAVAGE")!.interpret(12);
    expect(i.level).toBe("bad");
  });

  it("Pfeiffer: más errores = peor (3 errores → leve)", () => {
    expect(getScaleDefinition("PFEIFFER")!.interpret(3).label).toContain("leve");
    expect(getScaleDefinition("PFEIFFER")!.interpret(0).level).toBe("good");
  });

  it("Lawton: puntúa e interpreta distinto por sexo (H no puntúa 3 ítems)", () => {
    const def = getScaleDefinition("LAWTON")!;
    // Mejor opción (índice 0) en los 8 ítems.
    const best = {
      telefono: 0,
      compras: 0,
      comida: 0,
      casa: 0,
      ropa: 0,
      transporte: 0,
      medicacion: 0,
      finanzas: 0,
    };
    // Mujer: máximo 8. Hombre: comida/casa/ropa no puntúan → 5.
    expect(computeScaleScore(def, best, { sex: "FEMENINO" })).toBe(8);
    expect(computeScaleScore(def, best, { sex: "MASCULINO" })).toBe(5);
    expect(scaleMaxScore(def, "FEMENINO")).toBe(8);
    expect(scaleMaxScore(def, "MASCULINO")).toBe(5);
    // Ambos: máximo de su sexo = autónomo (bueno).
    expect(def.interpret(8, { sex: "FEMENINO" }).level).toBe("good");
    expect(def.interpret(5, { sex: "MASCULINO" }).level).toBe("good");
    // Un hombre con 1 punto es dependencia grave; una mujer con 1, total.
    expect(def.interpret(1, { sex: "MASCULINO" }).label).toContain("grave");
    expect(def.interpret(1, { sex: "FEMENINO" }).label).toContain("total");
  });

  it("Escalas sociales: Gijón, APGAR y Zarit puntúan e interpretan bien", () => {
    const gijon = getScaleDefinition("GIJON")!;
    // Peor opción (índice 4 = 5 puntos) en los 5 ítems → 25 = problema social.
    const peorGijon = { familiar: 4, economica: 4, vivienda: 4, relaciones: 4, apoyo: 4 };
    expect(computeScaleScore(gijon, peorGijon)).toBe(25);
    expect(gijon.interpret(25).level).toBe("bad");
    expect(gijon.interpret(8).level).toBe("good");

    const apgar = getScaleDefinition("APGAR")!;
    expect(apgar.interpret(10).label).toContain("funcional");
    expect(apgar.interpret(2).level).toBe("bad");

    const zarit = getScaleDefinition("ZARIT")!;
    expect(zarit.questions).toHaveLength(22);
    // Todos "Algunas veces" (índice 2 = 3 puntos) → 66 = sobrecarga intensa.
    const zAns = Object.fromEntries(zarit.questions.map((q) => [q.id, 2]));
    expect(computeScaleScore(zarit, zAns)).toBe(66);
    expect(zarit.interpret(66).level).toBe("bad");
    expect(zarit.interpret(30).level).toBe("good");
  });

  it("todas las escalas interpretan el puntaje máximo y el cero sin error", () => {
    for (const t of SCALE_TYPES) {
      const def = getScaleDefinition(t)!;
      expect(def.interpret(0).label).toBeTruthy();
      expect(def.interpret(def.maxScore).label).toBeTruthy();
    }
  });
});

describe("helpers clínicos", () => {
  it("calcula el IMC", () => {
    expect(calculateBMI(68, 160)).toBe(26.6);
    expect(calculateBMI(null, 160)).toBeNull();
  });

  it("calcula la edad", () => {
    const ref = new Date(2026, 5, 25); // 25/06/2026
    // Cumpleaños ya pasado este año (15/03).
    expect(calculateAge(new Date(1942, 2, 15), ref)).toBe(84);
    // Cumpleaños aún no llegado este año (01/08): todavía no sumó el año.
    expect(calculateAge(new Date(1950, 7, 1), ref)).toBe(75);
  });
});

// Respuestas válidas de Barthel como ÍNDICES de opción (todas "independiente").
function validBarthel() {
  return {
    alimentacion: 2,
    bano: 1,
    aseo: 1,
    vestido: 2,
    deposiciones: 2,
    miccion: 2,
    retrete: 2,
    traslado: 3,
    deambulacion: 2,
    escaleras: 2,
  };
}
