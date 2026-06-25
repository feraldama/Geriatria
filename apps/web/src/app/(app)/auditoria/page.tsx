"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { formatDateTime, type AuditLogItem } from "@geriatria/schemas";
import { useAuditLog } from "@/lib/admin";
import { useDebounce } from "@/lib/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn, type SortDir } from "@/components/ui/data-table";

export default function AuditoriaPage() {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ by: string; dir: SortDir }>({ by: "createdAt", dir: "desc" });
  const action = useDebounce(filter.trim());
  const { data, isLoading, isError } = useAuditLog(action, page, sort);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 30)));

  const columns: DataTableColumn<AuditLogItem>[] = [
    {
      key: "createdAt",
      header: "Fecha y hora",
      sortable: true,
      cellClassName: "whitespace-nowrap",
      render: (e) => formatDateTime(e.createdAt),
    },
    { key: "user", header: "Usuario", render: (e) => (e.user ? e.user.name : "—") },
    { key: "action", header: "Acción", sortable: true, cellClassName: "font-mono text-sm", render: (e) => e.action },
    {
      key: "resource",
      header: "Recurso",
      cellClassName: "text-sm text-muted-foreground",
      render: (e) => `${e.resource ?? "—"}${e.resourceId ? ` · ${e.resourceId.slice(0, 8)}…` : ""}`,
    },
    { key: "ip", header: "IP", cellClassName: "tabular-nums text-sm", render: (e) => e.ipAddress ?? "—" },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Auditoría</h1>
        <p className="text-muted-foreground">
          {total} {total === 1 ? "evento registrado" : "eventos registrados"}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="Filtrar por acción (ej. login, patient.update)…"
          aria-label="Filtrar auditoría"
          className="pl-10"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
        />
      </div>

      <Card className="overflow-hidden">
        {isError ? (
          <p className="p-8 text-center text-destructive">No se pudo cargar la auditoría.</p>
        ) : isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Cargando…</p>
        ) : data && data.data.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Sin eventos.</p>
        ) : (
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(e) => e.id}
            sortBy={sort.by}
            sortDir={sort.dir}
            onSort={(by, dir) => { setSort({ by, dir }); setPage(1); }}
          />
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
