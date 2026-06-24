/** Middleware para validar el body con un esquema Zod antes del handler. */
import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, infer as ZodInfer } from "zod";
import { HttpError } from "../lib/errors.js";

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const error = new HttpError(400, "Datos inválidos", "VALIDATION_ERROR");
      // Adjuntamos los detalles de campo para el manejador de errores.
      (error as HttpError & { details?: unknown }).details =
        result.error.flatten().fieldErrors;
      return next(error);
    }
    // Reemplazamos el body por la versión validada/tipada.
    req.body = result.data as ZodInfer<T>;
    next();
  };
}
