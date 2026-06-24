/** Firmado y verificación de los JWT de sesión. */
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export const SESSION_COOKIE = "geriatria_session";

export interface SessionPayload {
  sub: string; // id del usuario
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, env.JWT_SECRET) as SessionPayload;
}

/** Opciones de la cookie de sesión (httpOnly; Secure configurable por env). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE, // activable cuando el operador sirva por HTTPS
    sameSite: "lax" as const,
    path: "/",
  };
}
