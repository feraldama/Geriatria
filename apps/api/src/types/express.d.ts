import type { AuthenticatedUser } from "@geriatria/schemas";

// Extendemos el Request de Express para llevar el usuario autenticado.
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
