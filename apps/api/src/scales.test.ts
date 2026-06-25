/**
 * Tests del motor de escalas geriátricas (lógica clínica compartida).
 * Protege el cálculo de puntaje y la interpretación contra regresiones.
 */
import { describe, it, expect } from "vitest";
import {
  getScaleDefinition,
  computeScaleScore,
  calculateBMI,
  calculateAge,
  SCALE_TYPES,
} from "@geriatria/schemas";

describe("computeScaleScore", () => {
  it("suma correctamente el Índice de Barthel", () => {
    const def = getScaleDefinition("BARTHEL")!;
    const answers = {
      alimentacion: 10,
      bano: 5,
      aseo: 5,
      vestido: 10,
      deposiciones: 10,
      miccion: 10,
      retrete: 10,
      traslado: 15,
      deambulacion: 10,
      escaleras: 5,
    };
    expect(computeScaleScore(def, answers)).toBe(90);
  });

  it("rechaza una opción inválida", () => {
    const def = getScaleDefinition("BARTHEL")!;
    expect(() => computeScaleScore(def, { ...validBarthel(), bano: 7 })).toThrow();
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

function validBarthel() {
  return {
    alimentacion: 10,
    bano: 5,
    aseo: 5,
    vestido: 10,
    deposiciones: 10,
    miccion: 10,
    retrete: 10,
    traslado: 15,
    deambulacion: 10,
    escaleras: 5,
  };
}
