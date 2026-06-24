"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CreatePatientInput } from "@geriatria/schemas";
import { usePatient, useUpdatePatient } from "@/lib/patients";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PatientForm } from "@/components/patient-form";

export default function EditarPacientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: patient, isLoading, isError } = usePatient(id);
  const update = useUpdatePatient(id);
  const { toast } = useToast();

  async function onSubmit(data: CreatePatientInput) {
    await update.mutateAsync(data);
    toast("Cambios guardados");
    router.replace(`/pacientes/${id}`);
  }

  const serverError =
    update.error instanceof ApiError ? update.error.message : update.error ? "No se pudo guardar" : null;

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (isError || !patient)
    return <p className="p-6 text-destructive">No se pudo cargar el paciente.</p>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href={`/pacientes/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a la ficha
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold">
          Editar: {patient.firstName} {patient.lastName}
        </h1>
      </div>
      <PatientForm
        initial={patient}
        submitting={update.isPending}
        serverError={serverError}
        onSubmit={onSubmit}
        onCancel={() => router.push(`/pacientes/${id}`)}
      />
    </div>
  );
}
