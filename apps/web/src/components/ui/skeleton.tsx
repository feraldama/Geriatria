import * as React from "react";
import { Table, THead, TBody, TR, TH, TD } from "./table";
import { Card } from "./card";
import { cn } from "@/lib/utils";

/**
 * Placeholders de carga (skeletons) del design system.
 *
 * - Usan el token `muted` y `animate-pulse`; con `prefers-reduced-motion` la
 *   animación queda anulada por la regla global de globals.css.
 * - Las variantes replican las primitivas reales (Table, Card) con las mismas
 *   alturas de línea, para que el contenido no salte al llegar (CLS ≈ 0).
 * - Los anchos varían con un ciclo determinístico, nunca con Math.random():
 *   el render del servidor y del cliente deben coincidir (hidratación).
 */

/** Bloque base. Decorativo: queda oculto para lectores de pantalla. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
  );
}

/** Ciclo de anchos para que las "líneas de texto" no se vean idénticas. */
const WIDTHS = ["w-24", "w-16", "w-32", "w-20", "w-28", "w-14"];
const width = (i: number) => WIDTHS[i % WIDTHS.length];

/** Párrafo en carga: líneas de texto, la última más corta. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-label="Cargando" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/**
 * Tabla en carga: misma estructura que DataTable (encabezado + filas con las
 * celdas `px-4 py-3` reales), así la tabla verdadera aparece sin reacomodo.
 */
export function SkeletonTable({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Cargando datos">
      <Table>
        <THead>
          <TR>
            {Array.from({ length: cols }, (_, c) => (
              <TH key={c}>
                <Skeleton className="h-4 w-16 max-w-full" />
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {Array.from({ length: rows }, (_, r) => (
            <TR key={r} className="hover:bg-transparent">
              {Array.from({ length: cols }, (_, c) => (
                <TD key={c}>
                  {/* h-6 = alto de una línea text-base; iguala la fila real. */}
                  <div className="flex h-6 items-center">
                    <Skeleton className={cn("h-4 max-w-full", width(r + c))} />
                  </div>
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

/** Lista de cards en carga (consultas, listados con tarjetas apiladas). */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-44 max-w-full" />
            <Skeleton className="h-5 w-28 max-w-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </Card>
      ))}
    </div>
  );
}
