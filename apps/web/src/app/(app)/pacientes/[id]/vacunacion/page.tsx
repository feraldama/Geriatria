"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Syringe, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { formatDate, PERMISSIONS, type VaccinationItem } from "@geriatria/schemas";
import { useVaccinations, useDeleteVaccination } from "@/lib/extras";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { PatientSubHeader } from "@/components/patient-subheader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VaccinationForm } from "@/components/vaccination-form";

export default function VacunacionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: vaccinations, isLoading, isError } = useVaccinations(id);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);
  const { toast } = useToast();
  const del = useDeleteVaccination(id);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VaccinationItem | undefined>();
  const [toDelete, setToDelete] = useState<VaccinationItem | null>(null);

  const now = Date.now();

  async function onConfirmDelete() {
    if (!toDelete) return;
    await del.mutateAsync(toDelete.id);
    toast("Vacuna eliminada");
    setToDelete(null);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Vacunación</h2>
        {canWrite && (
          <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            <Plus className="h-5 w-5" aria-hidden />
            Registrar vacuna
          </Button>
        )}
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">No se pudo cargar la vacunación.</Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : !vaccinations || vaccinations.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Sin vacunas registradas.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {vaccinations.map((v) => {
            const overdue = v.nextDoseDate && new Date(v.nextDoseDate).getTime() < now;
            return (
              <Card key={v.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="flex min-w-0 gap-3">
                  <Syringe className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium">{v.vaccine}</p>
                    <p className="text-sm text-muted-foreground">
                      {v.doseDate ? `Aplicada ${formatDate(v.doseDate)}` : "Sin fecha de aplicación"}
                      {v.nextDoseDate ? ` · Próxima dosis ${formatDate(v.nextDoseDate)}` : ""}
                    </p>
                    {v.notes && <p className="mt-1 text-sm text-muted-foreground">{v.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {overdue && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      Dosis vencida
                    </Badge>
                  )}
                  {canWrite && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(v); setFormOpen(true); }} aria-label={`Editar ${v.vaccine}`}>
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setToDelete(v)} aria-label={`Eliminar ${v.vaccine}`}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={formOpen}
        title={editing ? "Editar vacuna" : "Registrar vacuna"}
        onClose={() => setFormOpen(false)}
        closeOnBackdrop={false}
        maxWidth="max-w-lg"
      >
        <VaccinationForm patientId={id} initial={editing} onSuccess={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar la vacuna?"
        description={toDelete ? `Se quitará "${toDelete.vaccine}" del registro.` : ""}
        confirmLabel="Eliminar"
        destructive
        loading={del.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
