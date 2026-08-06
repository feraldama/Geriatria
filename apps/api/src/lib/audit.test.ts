/**
 * Tests del diff de auditoría.
 *
 * Es lo que hace utilizable la traza de una historia clínica: sin el antes/
 * después solo queda registrado que "alguien editó algo".
 */
import { describe, it, expect } from "vitest";
import { diffFields } from "./audit.js";

describe("diffFields", () => {
  it("devuelve null si nada cambió", () => {
    expect(diffFields({ a: 1, b: "x" }, { a: 1, b: "x" })).toBeNull();
  });

  it("incluye solo los campos que cambiaron", () => {
    const resultado = diffFields(
      { plan: "reposo", dosis: "10 mg", notas: "sin cambios" },
      { plan: "kinesiología", dosis: "10 mg", notas: "sin cambios" },
    );
    expect(resultado).toEqual({
      before: { plan: "reposo" },
      after: { plan: "kinesiología" },
    });
  });

  it("trata null e undefined como equivalentes (campo vacío)", () => {
    expect(diffFields({ notas: null }, { notas: undefined })).toBeNull();
  });

  it("detecta que un campo pasó de vacío a tener contenido", () => {
    expect(diffFields({ notas: null }, { notas: "alergia a penicilina" })).toEqual({
      before: { notas: null },
      after: { notas: "alergia a penicilina" },
    });
  });

  it("detecta que se borró el contenido de un campo", () => {
    expect(diffFields({ notas: "alergia a penicilina" }, { notas: null })).toEqual({
      before: { notas: "alergia a penicilina" },
      after: { notas: null },
    });
  });

  it("compara objetos y arreglos por su contenido", () => {
    expect(diffFields({ examen: { pa: "120/80" } }, { examen: { pa: "120/80" } })).toBeNull();
    expect(diffFields({ examen: { pa: "120/80" } }, { examen: { pa: "140/90" } })).toEqual({
      before: { examen: { pa: "120/80" } },
      after: { examen: { pa: "140/90" } },
    });
  });

  it("registra un campo que aparece o desaparece", () => {
    expect(diffFields({ a: 1 } as Record<string, unknown>, { a: 1, b: 2 })).toEqual({
      before: { b: undefined },
      after: { b: 2 },
    });
  });

  it("distingue 0 y cadena vacía de ausencia", () => {
    expect(diffFields({ score: 0 }, { score: null })).not.toBeNull();
    expect(diffFields({ texto: "" }, { texto: null })).not.toBeNull();
  });
});
