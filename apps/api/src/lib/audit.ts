/** Helper para registrar eventos de auditoría sin interrumpir el flujo principal. */
import type { Request } from "express";
import { prisma } from "./prisma.js";

interface AuditInput {
  userId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Diff de los campos que realmente cambiaron, para guardar en `metadata`.
 *
 * En una historia clínica no alcanza con saber que alguien editó algo: hay que
 * poder reconstruir el estado anterior. Solo se incluyen las claves con valor
 * distinto, para no inflar la tabla de auditoría con registros redundantes.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
): { before: Partial<T>; after: Partial<T> } | null {
  const changedBefore: Partial<T> = {};
  const changedAfter: Partial<T> = {};
  let changed = false;

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof T>) {
    const prev = before[key];
    const next = after[key];
    if (JSON.stringify(prev ?? null) === JSON.stringify(next ?? null)) continue;
    changedBefore[key] = prev;
    changedAfter[key] = next;
    changed = true;
  }

  return changed ? { before: changedBefore, after: changedAfter } : null;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: input.metadata as object | undefined,
        ipAddress: input.req?.ip,
        userAgent: input.req?.get("user-agent") ?? undefined,
      },
    });
  } catch (err) {
    // La auditoría no debe romper la operación principal; solo registramos.
    console.error("No se pudo registrar auditoría:", err);
  }
}
