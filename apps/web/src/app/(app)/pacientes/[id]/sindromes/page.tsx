"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, Check, Minus } from "lucide-react";
import {
  formatDate,
  GERIATRIC_SYNDROMES,
  PERMISSIONS,
} from "@geriatria/schemas";
import { useSyndromes } from "@/lib/syndromes";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { PatientSubHeader } from "@/components/patient-subheader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SindromesPage() {
  const { id } = useParams<{ id: string }>();
  const { data: assessments, isLoading, isError } = useSyndromes(id);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);

  const latest = assessments?.[0];
  const present = new Set(latest?.present ?? []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Síndromes geriátricos</h2>
          <p className="text-sm text-muted-foreground">
            Checklist de presencia/ausencia. La evaluación más reciente refleja el estado actual.
          </p>
        </div>
        {canWrite && (
          <Link
            href={`/pacientes/${id}/sindromes/evaluar`}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva evaluación
          </Link>
        )}
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">No se pudieron cargar los síndromes.</Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : !latest ? (
        <Card className="p-10 text-center text-muted-foreground">
          Todavía no hay evaluaciones de síndromes geriátricos.
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Estado actual</CardTitle>
                <CardDescription>Evaluado el {formatDate(latest.assessedAt)}</CardDescription>
              </div>
              <Badge variant={present.size ? "destructive" : "outline"}>
                {present.size} de {GERIATRIC_SYNDROMES.length} presentes
              </Badge>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {GERIATRIC_SYNDROMES.map((s) => {
                  const on = present.has(s.key);
                  return (
                    <li
                      key={s.key}
                      className={cn(
                        "flex items-center gap-2 text-base",
                        on ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                          on ? "bg-destructive text-destructive-foreground" : "bg-muted",
                        )}
                        aria-hidden
                      >
                        {on ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3 w-3" />}
                      </span>
                      {s.label}
                    </li>
                  );
                })}
              </ul>
              {latest.notes && (
                <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
                  {latest.notes}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border">
                {assessments!.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/pacientes/${id}/sindromes/${a.id}`}
                      className="flex items-center justify-between gap-2 py-2 hover:text-primary"
                    >
                      <span>{formatDate(a.assessedAt)}</span>
                      <span className="tabular-nums text-sm text-muted-foreground">
                        {a.present.length} síndrome(s)
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
