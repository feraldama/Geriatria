"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  calculateAge,
  SEX_LABELS,
  PERMISSIONS,
  type PatientListItem,
} from "@geriatria/schemas";
import { usePatients } from "@/lib/patients";
import { useDebounce } from "@/lib/use-debounce";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn, type SortDir } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

export default function PacientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ by: string; dir: SortDir }>({ by: "lastName", dir: "asc" });
  const q = useDebounce(search.trim());
  const { data, isLoading, isError } = usePatients(q, page, 20, sort);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.PATIENT_WRITE);

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Enlace al detalle dentro de la celda → accesible por teclado; la fila
  // completa también navega (afordancia de mouse) en onRowClick.
  const nameLink = (p: PatientListItem, text: string) => (
    <Link
      href={`/pacientes/${p.id}`}
      onClick={(e) => e.stopPropagation()}
      className="hover:text-primary focus-visible:text-primary"
    >
      {text}
    </Link>
  );

  const columns: DataTableColumn<PatientListItem>[] = [
    {
      key: "lastName",
      header: "Apellido",
      sortable: true,
      cellClassName: "font-medium",
      render: (p) => nameLink(p, p.lastName),
    },
    {
      key: "firstName",
      header: "Nombre",
      sortable: true,
      cellClassName: "font-medium",
      render: (p) => nameLink(p, p.firstName),
    },
    {
      key: "documentId",
      header: "Documento",
      sortable: true,
      cellClassName: "tabular-nums",
      render: (p) => p.documentId ?? "—",
    },
    {
      key: "age",
      header: "Edad",
      sortable: true,
      cellClassName: "tabular-nums",
      render: (p) => `${calculateAge(p.birthDate)} años`,
    },
    { key: "sex", header: "Sexo", sortable: true, render: (p) => SEX_LABELS[p.sex] },
    {
      key: "phone",
      header: "Teléfono",
      sortable: true,
      cellClassName: "tabular-nums",
      render: (p) => p.phone ?? "—",
    },
    {
      key: "alerts",
      header: "Alertas",
      render: (p) =>
        p.allergyCount > 0 ? (
          <Badge variant="destructive">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {p.allergyCount} {p.allergyCount === 1 ? "alergia" : "alergias"}
          </Badge>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Pacientes</h1>
          <p className="text-muted-foreground">
            {total} {total === 1 ? "paciente registrado" : "pacientes registrados"}
          </p>
        </div>
        {canWrite && (
          <Link href="/pacientes/nuevo" className={cn(buttonVariants())}>
            <UserPlus className="h-5 w-5" aria-hidden />
            Nuevo paciente
          </Link>
        )}
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Buscar por nombre, apellido o documento…"
          aria-label="Buscar pacientes"
          className="pl-10"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card className="overflow-hidden">
        {isError ? (
          <p className="p-8 text-center text-destructive">No se pudieron cargar los pacientes.</p>
        ) : isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Cargando…</p>
        ) : data && data.data.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            {q ? (
              <>
                <p className="font-medium">Sin resultados para “{q}”.</p>
                <p className="text-sm">Probá con otro nombre, apellido o número de documento.</p>
              </>
            ) : (
              <>
                <p className="font-medium">Todavía no hay pacientes.</p>
                {canWrite && <p className="text-sm">Empezá creando el primero.</p>}
              </>
            )}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(p) => p.id}
            sortBy={sort.by}
            sortDir={sort.dir}
            onSort={(by, dir) => {
              setSort({ by, dir });
              setPage(1);
            }}
            onRowClick={(p) => router.push(`/pacientes/${p.id}`)}
          />
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
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
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
