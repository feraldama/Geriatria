"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "./table";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export interface DataTableColumn<T> {
  /** Clave de ordenamiento que se envía al backend. */
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right";
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Estado de ordenamiento actual (lo controla el backend). */
  sortBy?: string;
  sortDir?: SortDir;
  /** Se llama con la columna y la nueva dirección al pedir reordenar. */
  onSort?: (key: string, dir: SortDir) => void;
  /** Click en la fila (afordancia de mouse; usar un enlace en una celda para teclado). */
  onRowClick?: (row: T) => void;
}

/**
 * Tabla reutilizable con ordenamiento por columna. El ordenamiento real lo
 * resuelve el backend: este componente solo refleja el estado y emite cambios.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
}: DataTableProps<T>) {
  function handleSort(col: DataTableColumn<T>) {
    if (!col.sortable || !onSort) return;
    // Si ya se ordena por esta columna, alterna dirección; si no, arranca asc.
    const nextDir: SortDir = sortBy === col.key && sortDir === "asc" ? "desc" : "asc";
    onSort(col.key, nextDir);
  }

  return (
    <Table>
      <THead>
        <TR>
          {columns.map((col) => {
            const active = sortBy === col.key;
            const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
            return (
              <TH
                key={col.key}
                aria-sort={col.sortable ? ariaSort : undefined}
                className={cn(col.align === "right" && "text-right", col.headerClassName)}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col)}
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold hover:text-foreground focus-visible:outline-none",
                      active ? "text-foreground" : "text-muted-foreground",
                      col.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {col.header}
                    {active ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      )
                    ) : (
                      <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </TH>
            );
          })}
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => {
          const clickable = !!onRowClick;
          return (
            <TR
              key={rowKey(row)}
              // `group` + `group-hover` en cada celda garantiza que se resalte
              // la fila COMPLETA (todas las celdas), no solo donde hay texto.
              className={clickable ? "group cursor-pointer hover:bg-transparent" : undefined}
              onClick={clickable ? () => onRowClick!(row) : undefined}
            >
              {columns.map((col) => (
                <TD
                  key={col.key}
                  className={cn(
                    col.align === "right" && "text-right tabular-nums",
                    clickable && "transition-colors group-hover:bg-row-hover",
                    col.cellClassName,
                  )}
                >
                  {col.render(row)}
                </TD>
              ))}
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
