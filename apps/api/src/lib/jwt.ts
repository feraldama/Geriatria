/** Firmado y verificación de los JWT de sesión. */
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export const SESSION_COOKIE = "geriatria_session";

const ISSUER = "geriatria";
const AUDIENCE = "geriatria-web";

export interface SessionPayload {
  sub: string; // id del usuario
  // Versión del token: si el usuario cambia su contraseña, la versión sube y
  // los tokens emitidos antes dejan de ser válidos.
  ver: number;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifySession(token: string): SessionPayload {
  // Fijamos el algoritmo y el emisor: aceptar cualquiera sería una regresión
  // esperando ocurrir (confusión de algoritmos, tokens de otro sistema).
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  }) as SessionPayload;
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
