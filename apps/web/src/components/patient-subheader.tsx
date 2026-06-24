"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { calculateAge, SEX_LABELS } from "@geriatria/schemas";
import { usePatient } from "@/lib/patients";
import { PatientTabs } from "@/components/patient-tabs";

/** Encabezado común de las sub-páginas del paciente (nombre + tabs). */
export function PatientSubHeader({ patientId }: { patientId: string }) {
  const { data: p } = usePatient(patientId);
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/pacientes/${patientId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a la ficha
      </Link>
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {p ? `${p.firstName} ${p.lastName}` : "Paciente"}
        </h1>
        {p && (
          <p className="text-muted-foreground">
            {calculateAge(p.birthDate)} años · {SEX_LABELS[p.sex]}
          </p>
        )}
      </div>
      <PatientTabs patientId={patientId} />
    </div>
  );
}
