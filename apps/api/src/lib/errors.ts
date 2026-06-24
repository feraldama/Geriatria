/** Errores de aplicación con código HTTP, para el manejador central. */

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (msg = "Solicitud inválida") => new HttpError(400, msg, "BAD_REQUEST");
export const unauthorized = (msg = "No autenticado") => new HttpError(401, msg, "UNAUTHORIZED");
export const forbidden = (msg = "No autorizado") => new HttpError(403, msg, "FORBIDDEN");
export const notFound = (msg = "No encontrado") => new HttpError(404, msg, "NOT_FOUND");
export const tooManyRequests = (msg = "Demasiadas solicitudes") =>
  new HttpError(429, msg, "TOO_MANY_REQUESTS");
