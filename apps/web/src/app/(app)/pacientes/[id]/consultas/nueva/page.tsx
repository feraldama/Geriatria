"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PatientSubHeader } from "@/components/patient-subheader";
import { ConsultationForm } from "@/components/consultation-form";

export default function NuevaConsultaPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId") ?? undefined;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PatientSubHeader patientId={id} />
      <h2 className="font-heading text-xl font-semibold">Nueva consulta</h2>
      <ConsultationForm patientId={id} appointmentId={appointmentId} />
    </div>
  );
}
