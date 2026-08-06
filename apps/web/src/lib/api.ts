/**
 * Cliente HTTP mínimo para hablar con la API. Usa rutas relativas (`/api/v1`)
 * que Next reenvía al backend (ver next.config.mjs), de modo que la cookie de
 * sesión httpOnly viaja en el mismo origen.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = "/api/v1";

// Una petición colgada dejaría el spinner del botón girando para siempre.
const TIMEOUT_MS = 30_000;

/**
 * Se avisa cuando la sesión dejó de ser válida (401).
 *
 * La capa de red no conoce el router ni el cache de queries, así que en vez de
 * navegar desde acá notifica y `<SessionWatcher>` decide qué hacer.
 */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "La operación tardó demasiado. Verificá tu conexión.", "TIMEOUT");
    }
    throw new ApiError(0, "No se pudo conectar con el servidor.", "NETWORK");
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  // Una respuesta no-JSON (error del proxy, página de error de Next) no debe
  // reventar con un SyntaxError críptico.
  let body: { error?: { message?: string; code?: string; details?: unknown } } | null = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (res.ok) throw new ApiError(res.status, "Respuesta inesperada del servidor", "BAD_RESPONSE");
    }
  }

  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.message ?? "Error de red", err.code, err.details);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
