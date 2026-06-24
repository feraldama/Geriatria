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
