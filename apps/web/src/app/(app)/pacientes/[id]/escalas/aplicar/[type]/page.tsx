"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getScaleDefinition } from "@geriatria/schemas";
import { PatientSubHeader } from "@/components/patient-subheader";
import { ScaleForm } from "@/components/scale-form";

export default function AplicarEscalaPage() {
  const { id, type } = useParams<{ id: string; type: string }>();
  const def = getScaleDefinition(type);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PatientSubHeader patientId={id} />
      <Link
        href={`/pacientes/${id}/escalas`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a escalas
      </Link>

      {!def ? (
        <p className="p-6 text-destructive">Escala desconocida.</p>
      ) : (
        <>
          <div>
            <h2 className="font-heading text-xl font-semibold">Aplicar: {def.name}</h2>
            <p className="text-sm text-muted-foreground">{def.description}</p>
          </div>
          <ScaleForm patientId={id} def={def} />
        </>
      )}
    </div>
  );
}
