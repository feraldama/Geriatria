"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pill, AlertTriangle, Pencil, Ban, RotateCcw, Trash2 } from "lucide-react";
import {
  formatDate,
  MEDICATION_ROUTE_LABELS,
  PERMISSIONS,
  type MedicationItem,
} from "@geriatria/schemas";
import {
  useMedications,
  useReactivateMedication,
  useDeleteMedication,
} from "@/lib/medications";
import { usePatient } from "@/lib/patients";
import { ALLERGY_SEVERITY_LABELS } from "@geriatria/schemas";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { PatientSubHeader } from "@/components/patient-subheader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MedicationForm } from "@/components/medication-form";
import { SuspendMedicationForm } from "@/components/suspend-medication-form";

// Resumen de una línea de medicación (dosis · frecuencia · vía).
function medLine(m: MedicationItem): string {
  return [m.dose, m.frequency, m.route ? MEDICATION_ROUTE_LABELS[m.route] : null]
    .filter(Boolean)
    .join(" · ");
}

export default function MedicacionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meds, isLoading, isError } = useMedications(id);
  const { data: patient } = usePatient(id);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);
  const { toast } = useToast();
  const reactivate = useReactivateMedication(id);
  const del = useDeleteMedication(id);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationItem | undefined>();
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [deleteMed, setDeleteMed] = useState<MedicationItem | null>(null);

  const active = meds?.filter((m) => m.status === "ACTIVA") ?? [];
  const suspended = meds?.filter((m) => m.status === "SUSPENDIDA") ?? [];

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(m: MedicationItem) {
    setEditing(m);
    setFormOpen(true);
  }
  async function onReactivate(m: MedicationItem) {
    await reactivate.mutateAsync(m.id);
    toast("Medicamento reactivado");
  }
  async function onConfirmDelete() {
    if (!deleteMed) return;
    await del.mutateAsync(deleteMed.id);
    toast("Medicamento eliminado");
    setDeleteMed(null);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Medicación</h2>
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="h-5 w-5" aria-hidden />
            Agregar medicamento
          </Button>
        )}
      </div>

      {/* Alergias visibles al conciliar/prescribir (seguridad clínica). */}
      {patient && patient.allergies.length > 0 && (
        <div
          role="note"
          className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-destructive"
        >
          <span className="inline-flex items-center gap-1 font-medium">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Alergias:
          </span>
          {patient.allergies.map((a) => (
            <Badge key={a.id} variant="destructive">
              {a.substance}
              {a.severity ? ` · ${ALLERGY_SEVERITY_LABELS[a.severity]}` : ""}
            </Badge>
          ))}
        </div>
      )}

      {isError ? (
        <Card className="p-10 text-center text-destructive">
          No se pudo cargar la medicación.
        </Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : (
        <>
          {/* Conciliación de medicación activa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" aria-hidden />
                Medicación activa (conciliación)
                <span className="text-base font-normal text-muted-foreground">
                  {active.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {active.length === 0 ? (
                <p className="text-muted-foreground">Sin medicación activa registrada.</p>
              ) : (
                active.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{m.drug}</p>
                      {medLine(m) && <p className="text-sm text-muted-foreground">{medLine(m)}</p>}
                      <p className="text-sm text-muted-foreground">
                        {m.startDate ? `Desde ${formatDate(m.startDate)}` : ""}
                        {m.prescribedBy ? ` · Indicado por ${m.prescribedBy}` : ""}
                      </p>
                      {m.alertNote && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-sm text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          {m.alertNote}
                        </p>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" aria-hidden />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSuspendId(m.id)}>
                          <Ban className="h-4 w-4" aria-hidden />
                          Suspender
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteMed(m)}
                          aria-label={`Eliminar ${m.drug}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Historial de suspendidos */}
          {suspended.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suspendidos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {suspended.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-muted-foreground line-through">{m.drug}</p>
                      <p className="text-sm text-muted-foreground">
                        {m.suspendedAt ? `Suspendido el ${formatDate(m.suspendedAt)}` : ""}
                        {m.suspendedReason ? ` · ${m.suspendedReason}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Suspendido</Badge>
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReactivate(m)}
                          loading={reactivate.isPending}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden />
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Alta / edición */}
      <Dialog
        open={formOpen}
        title={editing ? "Editar medicamento" : "Agregar medicamento"}
        onClose={() => setFormOpen(false)}
        closeOnBackdrop={false}
      >
        <MedicationForm
          patientId={id}
          initial={editing}
          onSuccess={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>

      {/* Suspensión */}
      <Dialog
        open={!!suspendId}
        title="Suspender medicamento"
        onClose={() => setSuspendId(null)}
        closeOnBackdrop={false}
        maxWidth="max-w-md"
      >
        {suspendId && (
          <SuspendMedicationForm
            patientId={id}
            medicationId={suspendId}
            onSuccess={() => setSuspendId(null)}
            onCancel={() => setSuspendId(null)}
          />
        )}
      </Dialog>

      {/* Eliminación */}
      <ConfirmDialog
        open={!!deleteMed}
        title="¿Eliminar el medicamento?"
        description={
          deleteMed
            ? `${deleteMed.drug} se quitará del listado. Es una baja lógica: la información se conserva.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        loading={del.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteMed(null)}
      />
    </div>
  );
}
