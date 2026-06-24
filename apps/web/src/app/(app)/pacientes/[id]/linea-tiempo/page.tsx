"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, CalendarDays } from "lucide-react";
import { formatDateTime, type TimelineEvent } from "@geriatria/schemas";
import { useTimeline } from "@/lib/clinical";
import { PatientSubHeader } from "@/components/patient-subheader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LineaTiempoPage() {
  const { id } = useParams<{ id: string }>();
  const { data: events, isLoading, isError } = useTimeline(id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PatientSubHeader patientId={id} />
      <h2 className="font-heading text-xl font-semibold">Línea de tiempo</h2>

      {isError ? (
        <Card className="p-10 text-center text-destructive">
          No se pudo cargar la línea de tiempo.
        </Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : !events || events.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Todavía no hay eventos en la historia del paciente.
        </Card>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-6">
          {events.map((e: TimelineEvent) => {
            const isConsultation = e.type === "consultation";
            const Icon = isConsultation ? FileText : CalendarDays;
            // Fecha local (no UTC) para abrir la agenda en el día correcto.
            const dt = new Date(e.date);
            const localDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
            const href = isConsultation
              ? `/pacientes/${id}/consultas/${e.id}`
              : `/agenda?view=dia&date=${localDate}`;
            return (
              <li key={`${e.type}-${e.id}`} className="relative">
                {/* Punto en la línea */}
                <span
                  className="absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden
                >
                  <Icon className="h-3 w-3" />
                </span>
                <Link href={href} className="block">
                  <Card className="p-4 transition-colors hover:border-primary">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{e.title}</span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        {e.status && <Badge variant="outline">{e.status}</Badge>}
                        {formatDateTime(e.date)}
                      </span>
                    </div>
                    {e.detail && (
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{e.detail}</p>
                    )}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
