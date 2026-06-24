/**
 * Test de humo de la Fase 0: el healthcheck responde y los endpoints
 * protegidos exigen autenticación. No requiere base de datos para el 401.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server.js";

const app = createApp();

describe("Fase 0 - autenticación y RBAC", () => {
  it("rechaza /api/v1/auth/me sin sesión (401)", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("valida el body del login (400 si falta email/password)", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 404 con formato JSON en rutas inexistentes", async () => {
    const res = await request(app).get("/api/v1/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
