"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export interface PaginatorProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Control de paginación "Anterior · Página X de Y · Siguiente". La página la
 * resuelve el backend: este componente solo refleja el estado y emite cambios.
 * Con una sola página no renderiza nada.
 */
export function Paginator({ page, totalPages, onPageChange }: PaginatorProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
    </nav>
  );
}
