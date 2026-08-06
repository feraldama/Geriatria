/**
 * Paginación de los listados de la API.
 *
 * Regla: **solo se pagina si el cliente lo pide**. Si aplicáramos un tope por
 * defecto, un listado clínico devolvería una página sin que la interfaz sepa
 * pedir la siguiente, y el resto de la historia del paciente desaparecería de
 * la pantalla sin ningún aviso. Igual se aplica un techo duro, muy por encima
 * del volumen real de un paciente, para que ninguna respuesta sea ilimitada.
 */
import type { Request } from "express";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;

/**
 * Techo cuando el cliente no pagina. Es holgado a propósito: cubre décadas de
 * historia de un paciente. Las respuestas incluyen `total`, así que si alguna
 * vez se alcanzara, el truncamiento sería detectable en lugar de silencioso.
 */
export const HARD_CAP = 2000;

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  /** true si el cliente pidió una página concreta. */
  explicit: boolean;
}

export function parsePagination(req: Request, defaultPageSize = DEFAULT_PAGE_SIZE): Pagination {
  const explicit = req.query.page !== undefined || req.query.pageSize !== undefined;

  if (!explicit) {
    return { page: 1, pageSize: HARD_CAP, skip: 0, take: HARD_CAP, explicit: false };
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(req.query.pageSize) || defaultPageSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, explicit: true };
}
