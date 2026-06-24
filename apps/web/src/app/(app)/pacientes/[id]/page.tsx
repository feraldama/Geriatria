"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, AlertTriangle, Phone, ShieldAlert } from "lucide-react";
import {
  calculateAge,
  formatDate,
  SEX_LABELS,
  MARITAL_STATUS_LABELS,
  DEPENDENCY_LEVEL_LABELS,
  HABIT_STATUS_LABELS,
  ALLERGY_SEVERITY_LABELS,
  PERMISSIONS,
  type PatientDetail,
} from "@geriatria/schemas";
import { usePatient, useDeletePatient } from "@/lib/patients";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PatientTabs } from "@/components/patient-tabs";
import { cn } from "@/lib/utils";

// Fila etiqueta/valor; muestra "—" cuando no hay dato.
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base">{value ? value : "—"}</dd>
    </div>
  );
}

export default function PacienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: patient, isLoading, isError } = usePatient(id);
  const { data: user } = useCurrentUser();
  const del = useDeletePatient();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canWrite = hasPermission(user, PERMISSIONS.PATIENT_WRITE);
  const canDelete = hasPermission(user, PERMISSIONS.PATIENT_DELETE);

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (isError || !patient)
    return <p className="p-6 text-destructive">No se pudo cargar el paciente.</p>;

  const p: PatientDetail = patient;

  async function onConfirmDelete() {
    await del.mutateAsync(id);
    toast(`${p.firstName} ${p.lastName} dado de baja`);
    router.replace("/pacientes");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a pacientes
      </Link>

      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {p.firstName} {p.lastName}
          </h1>
          <p className="text-muted-foreground">
            {calculateAge(p.birthDate)} años · {SEX_LABELS[p.sex]}
            {p.documentId ? ` · Doc. ${p.documentId}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Link href={`/pacientes/${id}/editar`} className={cn(buttonVariants({ variant: "outline" }))}>
              <Pencil className="h-4 w-4" aria-hidden />
              Editar
            </Link>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Dar de baja
            </Button>
          )}
        </div>
      </div>

      <PatientTabs patientId={id} />

      {/* Alergias: banda de alerta siempre visible y en rojo */}
      {p.allergies.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              Alergias
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {p.allergies.map((a) => (
              <Badge key={a.id} variant="destructive" className="text-base">
                {a.substance}
                {a.severity ? ` · ${ALLERGY_SEVERITY_LABELS[a.severity]}` : ""}
                {a.reaction ? ` (${a.reaction})` : ""}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="Dirección" value={p.address} />
              <Row label="Teléfono" value={p.phone} />
              <Row label="Teléfono alternativo" value={p.phoneAlt} />
              <Row label="Correo electrónico" value={p.email} />
              <Row label="Estado civil" value={p.maritalStatus ? MARITAL_STATUS_LABELS[p.maritalStatus] : null} />
            </dl>
          </CardContent>
        </Card>

        {/* Emergencia + seguro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" aria-hidden />
              Emergencia y seguro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="Contacto de emergencia" value={p.emergencyName} />
              <Row label="Teléfono de emergencia" value={p.emergencyPhone} />
              <Row label="Parentesco" value={p.emergencyRelation} />
              <Row label="Prestador / obra social" value={p.insuranceProvider} />
              <Row label="N.º de afiliado" value={p.insuranceNumber} />
            </dl>
          </CardContent>
        </Card>

        {/* Situación social */}
        <Card>
          <CardHeader>
            <CardTitle>Situación social</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="¿Con quién vive?" value={p.livesWith} />
              <Row
                label="Nivel de dependencia"
                value={p.dependencyLevel ? DEPENDENCY_LEVEL_LABELS[p.dependencyLevel] : null}
              />
              <Row label="Situación habitacional" value={p.housingSituation} />
            </dl>
          </CardContent>
        </Card>

        {/* Hábitos */}
        <Card>
          <CardHeader>
            <CardTitle>Hábitos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="Tabaco" value={p.smoking ? HABIT_STATUS_LABELS[p.smoking] : null} />
              <Row label="Alcohol" value={p.alcohol ? HABIT_STATUS_LABELS[p.alcohol] : null} />
              <Row label="Notas" value={p.habitsNotes} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Cuidadores */}
      <Card>
        <CardHeader>
          <CardTitle>Cuidadores y red de apoyo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {p.caregivers.length === 0 ? (
            <p className="text-muted-foreground">Sin cuidadores registrados.</p>
          ) : (
            p.caregivers.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium">
                    {c.name}
                    {c.isPrimary && (
                      <Badge variant="primary" className="ml-2">
                        Principal
                      </Badge>
                    )}
                    {c.livesWith && (
                      <Badge variant="outline" className="ml-2">
                        Convive
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{c.relationship || "Sin parentesco"}</p>
                </div>
                {c.phone && (
                  <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                    <Phone className="h-4 w-4" aria-hidden />
                    {c.phone}
                  </span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Condiciones crónicas */}
      <Card>
        <CardHeader>
          <CardTitle>Condiciones crónicas / comorbilidades</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {p.conditions.length === 0 ? (
            <p className="text-muted-foreground">Sin condiciones registradas.</p>
          ) : (
            p.conditions.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-1">
                <span>
                  {c.name}
                  {c.since ? (
                    <span className="text-muted-foreground"> · desde {formatDate(c.since)}</span>
                  ) : null}
                  {c.notes ? <span className="text-muted-foreground"> · {c.notes}</span> : null}
                </span>
                <Badge variant={c.active ? "accent" : "outline"}>
                  {c.active ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Antecedentes y notas */}
      <Card>
        <CardHeader>
          <CardTitle>Antecedentes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Patológicos</p>
            <p className="whitespace-pre-wrap">{p.medicalHistory || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Quirúrgicos</p>
            <p className="whitespace-pre-wrap">{p.surgicalHistory || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Familiares</p>
            <p className="whitespace-pre-wrap">{p.familyHistory || "—"}</p>
          </div>
          {p.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notas generales</p>
              <p className="whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Dar de baja al paciente?"
        description={`${p.firstName} ${p.lastName} dejará de aparecer en el listado. Es una baja lógica: la información se conserva y puede recuperarse.`}
        confirmLabel="Dar de baja"
        destructive
        loading={del.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
