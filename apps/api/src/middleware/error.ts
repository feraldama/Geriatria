/** Manejador central de errores: traduce cualquier error a una respuesta JSON. */
import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/errors.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada" } });
}

/**
 * Traduce los errores conocidos de Prisma a códigos HTTP con sentido.
 *
 * Sin esto, un dato duplicado o una referencia inexistente llegan al usuario
 * como "Error interno del servidor", que no le dice qué corregir.
 */
function fromPrisma(err: unknown): HttpError | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;

  switch (err.code) {
    case "P2002": {
      const target = err.meta?.target;
      const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "");
      return new HttpError(
        409,
        fields ? `Ya existe un registro con ese valor (${fields})` : "Ya existe un registro con esos datos",
        "CONFLICT",
      );
    }
    case "P2025":
      return new HttpError(404, "El registro no existe o ya fue eliminado", "NOT_FOUND");
    case "P2003":
      return new HttpError(400, "Referencia inválida: el registro relacionado no existe", "BAD_REQUEST");
    case "P2014":
      return new HttpError(
        409,
        "No se puede completar: hay registros relacionados que dependen de este",
        "CONFLICT",
      );
    default:
      return null;
  }
}

// Express identifica el manejador de errores por su firma de 4 argumentos.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // Si la respuesta ya empezó a enviarse (p. ej. un stream de archivo que falla
  // a mitad), no podemos reescribir el status: delegamos al handler de Express.
  if (res.headersSent) return next(err);

  const httpError = err instanceof HttpError ? err : fromPrisma(err);

  if (httpError) {
    const details = (httpError as HttpError & { details?: unknown }).details;
    return res.status(httpError.statusCode).json({
      error: { code: httpError.code, message: httpError.message, ...(details ? { details } : {}) },
    });
  }

  console.error("Error no controlado:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
}
