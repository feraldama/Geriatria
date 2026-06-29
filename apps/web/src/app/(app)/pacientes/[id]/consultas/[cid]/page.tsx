"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Activity, Pencil } from "lucide-react";
import { formatDateTime, PERMISSIONS, type VitalSignItem } from "@geriatria/schemas";
import { useConsultation } from "@/lib/clinical";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SoapBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

// Muestra los valores no nulos de un registro de signos vitales.
function VitalsSummary({ v }: { v: VitalSignItem }) {
  const items: string[] = [];
  if (v.systolic && v.diastolic) items.push(`PA ${v.systolic}/${v.diastolic} mmHg`);
  if (v.heartRate) items.push(`FC ${v.heartRate} lpm`);
  if (v.respiratoryRate) items.push(`FR ${v.respiratoryRate} rpm`);
  if (v.temperature) items.push(`Tº ${v.temperature} °C`);
  if (v.oxygenSat) items.push(`SatO₂ ${v.oxygenSat}%`);
  if (v.weight) items.push(`Peso ${v.weight} kg`);
  if (v.height) items.push(`Talla ${v.height} cm`);
  if (v.bmi) items.push(`IMC ${v.bmi}`);
  if (v.calfCircumference) items.push(`C. pantorrilla ${v.calfCircumference} cm`);
  if (v.bloodGlucose) items.push(`Glicemia capilar ${v.bloodGlucose} mg/dL`);
  if (v.gripStrength) items.push(`Fuerza de agarre ${v.gripStrength} kg`);
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((it) => (
        <li key={it} className="tabular-nums">
          {it}
        </li>
      ))}
    </ul>
  );
}

export default function ConsultaDetallePage() {
  const { id, cid } = useParams<{ id: string; cid: string }>();
  const { data: c, isLoading, isError } = useConsultation(id, cid);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (isError || !c) return <p className="p-6 text-destructive">No se pudo cargar la consulta.</p>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={`/pacientes/${id}/consultas`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a consultas
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Consulta · {formatDateTime(c.date)}</h1>
        {canWrite && (
          <Link
            href={`/pacientes/${id}/consultas/${cid}/editar`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Editar
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolución (SOAP)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SoapBlock label="Subjetivo" value={c.subjective} />
          <SoapBlock label="Objetivo" value={c.objective} />
          <SoapBlock label="Análisis / Evaluación" value={c.assessment} />
          <SoapBlock label="Plan" value={c.plan} />
        </CardContent>
      </Card>

      {c.vitalSigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" aria-hidden />
              Signos vitales
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {c.vitalSigns.map((v) => (
              <VitalsSummary key={v.id} v={v} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
