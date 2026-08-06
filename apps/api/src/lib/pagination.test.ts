/**
 * Tests de la paginación.
 *
 * La regresión que motiva estos tests: aplicar un tope por defecto truncaba los
 * listados clínicos a los primeros 100 registros sin que la interfaz —que no
 * pagina— pudiera pedir el resto. En el caso de los signos vitales el orden por
 * defecto es ascendente, así que se mostraban los 100 MÁS VIEJOS y el peso y la
 * presión actuales desaparecían de la pantalla.
 */
import { describe, it, expect } from "vitest";
import type { Request } from "express";
import { parsePagination, HARD_CAP, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from "./pagination.js";

const req = (query: Record<string, string>) => ({ query }) as unknown as Request;

describe("parsePagination", () => {
  it("sin parámetros no trunca a un tamaño de página", () => {
    const p = parsePagination(req({}), 50);
    expect(p.explicit).toBe(false);
    expect(p.skip).toBe(0);
    expect(p.take).toBe(HARD_CAP);
  });

  it("sin parámetros el tope es holgado (cubre la historia de un paciente)", () => {
    expect(HARD_CAP).toBeGreaterThanOrEqual(1000);
  });

  it("pagina cuando el cliente lo pide con page", () => {
    const p = parsePagination(req({ page: "3" }), 50);
    expect(p.explicit).toBe(true);
    expect(p.take).toBe(50);
    expect(p.skip).toBe(100);
  });

  it("pagina cuando el cliente lo pide con pageSize", () => {
    const p = parsePagination(req({ pageSize: "10" }));
    expect(p.explicit).toBe(true);
    expect(p.take).toBe(10);
    expect(p.skip).toBe(0);
  });

  it("acota el tamaño de página pedido", () => {
    expect(parsePagination(req({ pageSize: "99999" })).take).toBe(MAX_PAGE_SIZE);
  });

  it("tolera valores basura sin romper", () => {
    const p = parsePagination(req({ page: "-5", pageSize: "abc" }));
    expect(p.page).toBe(1);
    expect(p.skip).toBe(0);
    expect(p.take).toBe(DEFAULT_PAGE_SIZE);
  });
});
