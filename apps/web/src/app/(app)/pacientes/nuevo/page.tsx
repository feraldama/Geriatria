"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CreatePatientInput } from "@geriatria/schemas";
import { useCreatePatient } from "@/lib/patients";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PatientForm } from "@/components/patient-form";

export default function NuevoPacientePage() {
  const router = useRouter();
  const create = useCreatePatient();
  const { toast } = useToast();

  async function onSubmit(data: CreatePatientInput) {
    const res = await create.mutateAsync(data);
    toast(`Paciente ${res.patient.firstName} ${res.patient.lastName} creado`);
    router.replace(`/pacientes/${res.patient.id}`);
  }

  const serverError =
    create.error instanceof ApiError ? create.error.message : create.error ? "No se pudo crear el paciente" : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href="/pacientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a pacientes
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold">Nuevo paciente</h1>
      </div>
      <PatientForm
        submitting={create.isPending}
        serverError={serverError}
        onSubmit={onSubmit}
        onCancel={() => router.push("/pacientes")}
      />
    </div>
  );
}
