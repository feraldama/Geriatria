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
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

// Celda numérica; "—" si no hay dato.
function Cell({ value }: { value: number | string | null }) {
  return <TD className="tabular-nums">{value ?? "—"}</TD>;
}

function pa(v: VitalSignItem) {
  return v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : null;
}

export default function VitalesPage() {
  const { id } = useParams<{ id: string }>();
  const { data: vitals, isLoading, isError } = useVitals(id);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);
  const [open, setOpen] = useState(false);

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
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>PA</TH>
                <TH>FC</TH>
                <TH>FR</TH>
                <TH>Tº</TH>
                <TH>SatO₂</TH>
                <TH>Peso</TH>
                <TH>Talla</TH>
                <TH>IMC</TH>
                <TH>C. pant.</TH>
              </TR>
            </THead>
            <TBody>
              {vitals.map((v) => (
                <TR key={v.id}>
                  <TD className="whitespace-nowrap">{formatDateTime(v.measuredAt)}</TD>
                  <Cell value={pa(v)} />
                  <Cell value={v.heartRate} />
                  <Cell value={v.respiratoryRate} />
                  <Cell value={v.temperature} />
                  <Cell value={v.oxygenSat} />
                  <Cell value={v.weight} />
                  <Cell value={v.height} />
                  <Cell value={v.bmi} />
                  <Cell value={v.calfCircumference} />
                </TR>
              ))}
            </TBody>
          </Table>
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
