/**
 * Hash y verificación de contraseñas.
 *
 * Usamos `bcryptjs` (implementación pura en JS) en lugar de `bcrypt` nativo
 * para evitar la compilación de binarios en Windows; el algoritmo es bcrypt
 * igual, como pide la especificación.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
