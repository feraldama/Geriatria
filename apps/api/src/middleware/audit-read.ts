/**
 * Auditoría de acceso de lectura a datos clínicos.
 *
 * En un sistema de historia clínica, saber quién *consultó* la información de
 * un paciente es tan importante como saber quién la modificó: es lo que permite
 * detectar accesos indebidos. Registrarlo por petición sería demasiado ruidoso,
 * así que se agrupa: un mismo usuario mirando al mismo paciente genera un solo
 * asiento por ventana de tiempo.
 */
import type { NextFunction, Request, Response } from "express";
import { recordAudit } from "../lib/audit.js";

const WINDOW_MS = 5 * 60_000;

// Última vez que se registró el par usuario+paciente.
const lastRecorded = new Map<string, number>();

// Evita que el mapa crezca sin techo en un proceso de larga vida.
function pruneExpired(now: number): void {
  if (lastRecorded.size < 5_000) return;
  for (const [key, at] of lastRecorded) {
    if (now - at > WINDOW_MS) lastRecorded.delete(key);
  }
}

// Firma de router.param: recibe el valor del parámetro como cuarto argumento.
export function auditClinicalRead(
  req: Request,
  _res: Response,
  next: NextFunction,
  patientId?: string,
) {
  // Solo lecturas y solo si conocemos al usuario y al paciente.
  if (req.method !== "GET" || !req.user || !patientId) return next();

  const key = `${req.user.id}:${patientId}`;
  const now = Date.now();
  const previous = lastRecorded.get(key);

  if (previous === undefined || now - previous > WINDOW_MS) {
    lastRecorded.set(key, now);
    pruneExpired(now);
    // No se espera: la auditoría nunca debe demorar la respuesta clínica.
    void recordAudit({
      userId: req.user.id,
      action: "clinical.read",
      resource: "patient",
      resourceId: patientId,
      metadata: { path: req.originalUrl.split("?")[0] },
      req,
    });
  }

  next();
}
