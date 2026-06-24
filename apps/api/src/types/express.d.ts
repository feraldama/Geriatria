import type { AuthenticatedUser } from "@geriatria/schemas";

// Extendemos el Request de Express para llevar el usuario autenticado.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
