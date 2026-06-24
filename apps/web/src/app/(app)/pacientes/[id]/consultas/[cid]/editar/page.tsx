"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useConsultation } from "@/lib/clinical";
import { ConsultationForm } from "@/components/consultation-form";

export default function EditarConsultaPage() {
  const { id, cid } = useParams<{ id: string; cid: string }>();
  const { data: consultation, isLoading, isError } = useConsultation(id, cid);

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (isError || !consultation)
    return <p className="p-6 text-destructive">No se pudo cargar la consulta.</p>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href={`/pacientes/${id}/consultas/${cid}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a la consulta
      </Link>
      <h1 className="font-heading text-2xl font-semibold">Editar consulta</h1>
      <ConsultationForm patientId={id} initial={consultation} />
    </div>
  );
}
