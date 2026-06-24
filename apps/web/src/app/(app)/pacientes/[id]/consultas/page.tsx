"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, Plus, Activity } from "lucide-react";
import { formatDateTime, PERMISSIONS } from "@geriatria/schemas";
import { useConsultations } from "@/lib/clinical";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { PatientSubHeader } from "@/components/patient-subheader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ConsultasPage() {
  const { id } = useParams<{ id: string }>();
  const { data: consultations, isLoading, isError } = useConsultations(id);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Consultas</h2>
        {canWrite && (
          <Link href={`/pacientes/${id}/consultas/nueva`} className={cn(buttonVariants())}>
            <Plus className="h-5 w-5" aria-hidden />
            Nueva consulta
          </Link>
        )}
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">
          No se pudieron cargar las consultas.
        </Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : !consultations || consultations.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Todavía no hay consultas registradas.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {consultations.map((c) => (
            <Link key={c.id} href={`/pacientes/${id}/consultas/${c.id}`} className="block">
              <Card className="p-4 transition-colors hover:border-primary">
                <CardContent className="flex flex-col gap-2 p-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-primary" aria-hidden />
                      {formatDateTime(c.date)}
                    </span>
                    {c.vitalSigns.length > 0 && (
                      <Badge variant="primary">
                        <Activity className="h-3.5 w-3.5" aria-hidden />
                        Signos vitales
                      </Badge>
                    )}
                  </div>
                  {(c.assessment || c.subjective || c.plan) && (
                    <p className="line-clamp-2 text-muted-foreground">
                      {c.assessment || c.subjective || c.plan}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
