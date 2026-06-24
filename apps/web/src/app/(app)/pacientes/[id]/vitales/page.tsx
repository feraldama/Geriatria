"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { formatDateTime, PERMISSIONS, type VitalSignItem } from "@geriatria/schemas";
import { useVitals } from "@/lib/clinical";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { PatientSubHeader } from "@/components/patient-subheader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { VitalsForm } from "@/components/vitals-form";
import { DataTable, type DataTableColumn, type SortDir } from "@/components/ui/data-table";

function pa(v: VitalSignItem) {
  return v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "—";
}

const num = (value: number | null) => value ?? "—";

export default function VitalesPage() {
  const { id } = useParams<{ id: string }>();
  const [sort, setSort] = useState<{ by: string; dir: SortDir }>({ by: "measuredAt", dir: "desc" });
  const { data: vitals, isLoading, isError } = useVitals(id, sort);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);
  const [open, setOpen] = useState(false);

  const columns: DataTableColumn<VitalSignItem>[] = [
    {
      key: "measuredAt",
      header: "Fecha",
      sortable: true,
      cellClassName: "whitespace-nowrap",
      render: (v) => formatDateTime(v.measuredAt),
    },
    { key: "systolic", header: "PA", sortable: true, align: "right", render: (v) => pa(v) },
    { key: "heartRate", header: "FC", sortable: true, align: "right", render: (v) => num(v.heartRate) },
    { key: "respiratoryRate", header: "FR", sortable: true, align: "right", render: (v) => num(v.respiratoryRate) },
    { key: "temperature", header: "Tº", sortable: true, align: "right", render: (v) => num(v.temperature) },
    { key: "oxygenSat", header: "SatO₂", sortable: true, align: "right", render: (v) => num(v.oxygenSat) },
    { key: "weight", header: "Peso", sortable: true, align: "right", render: (v) => num(v.weight) },
    { key: "height", header: "Talla", sortable: true, align: "right", render: (v) => num(v.height) },
    { key: "bmi", header: "IMC", sortable: true, align: "right", render: (v) => num(v.bmi) },
    { key: "calfCircumference", header: "C. pant.", sortable: true, align: "right", render: (v) => num(v.calfCircumference) },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Signos vitales</h2>
        {canWrite && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-5 w-5" aria-hidden />
            Agregar medición
          </Button>
        )}
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">
          No se pudieron cargar los signos vitales.
        </Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : !vitals || vitals.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Todavía no hay mediciones registradas.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            rows={vitals}
            rowKey={(v) => v.id}
            sortBy={sort.by}
            sortDir={sort.dir}
            onSort={(by, dir) => setSort({ by, dir })}
          />
        </Card>
      )}

      <Dialog
        open={open}
        title="Agregar signos vitales"
        onClose={() => setOpen(false)}
        closeOnBackdrop={false}
      >
        <VitalsForm patientId={id} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Dialog>
    </div>
  );
}
