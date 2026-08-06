/**
 * Matriz RBAC.
 *
 * Dos garantías distintas:
 *  1. `requirePermission` concede o niega correctamente para cada rol base.
 *  2. NINGUNA ruta de la API queda sin guarda. Este es el test que atrapa la
 *     regresión real: agregar un endpoint clínico y olvidarse el
 *     `requirePermission`, dejándolo abierto a cualquier sesión.
 */
import { describe, it, expect } from "vitest";
import type { NextFunction, Request, Response } from "express";
import {
  BASE_ROLES,
  BASE_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  PERMISSIONS,
  type BaseRoleName,
  type PermissionAction,
} from "@geriatria/schemas";
import { requirePermission } from "./permissions.js";
import { createApp } from "../server.js";

function runGuard(permissions: string[] | null, required: PermissionAction) {
  const req = (permissions ? { user: { permissions } } : {}) as Request;
  let error: unknown;
  let passed = false;
  const next: NextFunction = (err?: unknown) => {
    if (err) error = err;
    else passed = true;
  };
  requirePermission(required)(req, {} as Response, next);
  return { passed, status: (error as { statusCode?: number } | undefined)?.statusCode };
}

describe("requirePermission por rol base", () => {
  const roles = Object.values(BASE_ROLES) as BaseRoleName[];

  for (const role of roles) {
    const granted = BASE_ROLE_PERMISSIONS[role];

    for (const action of ALL_PERMISSIONS) {
      const shouldPass = granted.includes(action);
      it(`${role} ${shouldPass ? "accede a" : "es rechazado en"} ${action}`, () => {
        const result = runGuard(granted, action);
        expect(result.passed).toBe(shouldPass);
        if (!shouldPass) expect(result.status).toBe(403);
      });
    }
  }

  it("rechaza con 401 si no hay usuario en la petición", () => {
    const result = runGuard(null, PERMISSIONS.PATIENT_READ);
    expect(result.passed).toBe(false);
    expect(result.status).toBe(401);
  });
});

describe("Recepción no puede ver la historia clínica", () => {
  // Regla de negocio explícita del sistema, vale la pena fijarla en un test.
  const recepcion = BASE_ROLE_PERMISSIONS[BASE_ROLES.RECEPTION];

  it.each([PERMISSIONS.CLINICAL_READ, PERMISSIONS.CLINICAL_WRITE])("%s", (action) => {
    expect(runGuard(recepcion, action).passed).toBe(false);
  });
});

describe("Solo lectura no puede escribir nada", () => {
  const soloLectura = BASE_ROLE_PERMISSIONS[BASE_ROLES.READONLY];

  it.each([
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.PATIENT_DELETE,
    PERMISSIONS.APPOINTMENT_WRITE,
    PERMISSIONS.CLINICAL_WRITE,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ROLE_MANAGE,
  ])("%s", (action) => {
    expect(runGuard(soloLectura, action).passed).toBe(false);
  });
});

// ─── Cobertura de guardas sobre las rutas registradas ──────────────────────

interface RouteInfo {
  method: string;
  path: string;
  handlers: string[];
}

/** Reconstruye el prefijo con el que se montó un router a partir de su regexp. */
function mountPrefix(layer: { regexp?: RegExp & { fast_slash?: boolean } }): string {
  const re = layer.regexp;
  if (!re || re.fast_slash) return "";
  const match = re.source
    .replace("\\/?", "")
    .replace("(?=\\/|$)", "$")
    .match(/^\^((?:\\.|[^\\$^])*)\$?/);
  return match?.[1] ? match[1].replace(/\\(.)/g, "$1") : "";
}

/** Recorre el árbol de routers de Express y lista las rutas con sus handlers. */
function collectRoutes(app: ReturnType<typeof createApp>): RouteInfo[] {
  const routes: RouteInfo[] = [];

  const walk = (stack: unknown[], prefix: string, inherited: string[]) => {
    // Middlewares montados en este nivel (p. ej. router.use(requireAuth)):
    // aplican a todas las rutas que vengan después.
    const levelMiddleware = [...inherited];

    for (const entry of stack as {
      name?: string;
      route?: {
        path: string;
        stack: { name?: string; method?: string }[];
        methods?: Record<string, boolean>;
      };
      handle?: { stack?: unknown[] };
      regexp?: RegExp & { fast_slash?: boolean };
    }[]) {
      if (entry.route) {
        const handlers = [...levelMiddleware, ...entry.route.stack.map((h) => h.name ?? "anónimo")];
        for (const method of Object.keys(entry.route.methods ?? {})) {
          routes.push({ method: method.toUpperCase(), path: prefix + entry.route.path, handlers });
        }
      } else if (entry.handle?.stack) {
        walk(entry.handle.stack, prefix + mountPrefix(entry), levelMiddleware);
      } else if (entry.name && entry.name !== "<anonymous>") {
        levelMiddleware.push(entry.name);
      }
    }
  };

  walk((app as unknown as { _router: { stack: unknown[] } })._router.stack, "", []);
  return routes;
}

// Rutas públicas a propósito: son las que permiten obtener una sesión.
const SIN_SESION = new Set(["GET /health", "POST /api/v1/auth/login", "POST /api/v1/auth/logout"]);

// Rutas que exigen sesión pero ningún permiso concreto: operan sobre la propia
// cuenta del usuario, así que cualquiera autenticado puede usarlas.
const SIN_PERMISO = new Set([
  "GET /api/v1/auth/me",
  "PATCH /api/v1/auth/password",
  "GET /api/v1/profile/",
  "PATCH /api/v1/profile/",
]);

describe("todas las rutas declaran sus guardas", () => {
  const routes = collectRoutes(createApp());

  it("encuentra las rutas registradas", () => {
    expect(routes.length).toBeGreaterThan(30);
    // Si el recolector deja de reconstruir los prefijos, las excepciones de
    // abajo dejarían de coincidir y el test pasaría por el motivo equivocado.
    expect(routes.map((r) => r.path)).toContain("/api/v1/patients/:id");
  });

  it.each(
    routes
      .filter((r) => !SIN_SESION.has(`${r.method} ${r.path}`))
      .map((r) => [`${r.method} ${r.path}`, r] as const),
  )("%s exige autenticación", (_label, route) => {
    expect(route.handlers).toContain("requireAuth");
  });

  it.each(
    routes
      .filter((r) => !SIN_SESION.has(`${r.method} ${r.path}`))
      .filter((r) => !SIN_PERMISO.has(`${r.method} ${r.path}`))
      .map((r) => [`${r.method} ${r.path}`, r] as const),
  )("%s exige un permiso", (_label, route) => {
    // `permissionGuard` es el nombre de la closure que devuelve
    // requirePermission: si falta, la ruta quedó sin control de acceso.
    expect(route.handlers).toContain("permissionGuard");
  });

  it("las excepciones declaradas siguen existiendo", () => {
    // Evita que la lista de excepciones quede obsoleta y tape una ruta nueva.
    const todas = new Set(routes.map((r) => `${r.method} ${r.path}`));
    for (const ruta of [...SIN_SESION, ...SIN_PERMISO]) {
      expect(todas, `la excepción "${ruta}" ya no corresponde a ninguna ruta`).toContain(ruta);
    }
  });
});
