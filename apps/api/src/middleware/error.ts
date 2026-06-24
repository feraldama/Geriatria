/** Manejador central de errores: traduce cualquier error a una respuesta JSON. */
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada" } });
}

// Express identifica el manejador de errores por su firma de 4 argumentos.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    const details = (err as HttpError & { details?: unknown }).details;
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(details ? { details } : {}) },
    });
  }

  console.error("Error no controlado:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
}
