"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import {
  formatDate,
  NAMING_ITEM_COUNT,
  REPETITION_PHRASES,
  PERMISSIONS,
} from "@geriatria/schemas";
import { useLanguageAssessments } from "@/lib/cognition";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { PatientSubHeader } from "@/components/patient-subheader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function LenguajePage() {
  const { id } = useParams<{ id: string }>();
  const { data: items, isLoading, isError } = useLanguageAssessments(id);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Lenguaje y cognición</h2>
          <p className="text-sm text-muted-foreground">
            Nominación por láminas, repetición de frases y descripción de escena.
          </p>
        </div>
        {canWrite && (
          <Link
            href={`/pacientes/${id}/lenguaje/evaluar`}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva evaluación
          </Link>
        )}
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">No se pudieron cargar las evaluaciones.</Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : !items || items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Todavía no hay evaluaciones de lenguaje y cognición.
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
            <CardDescription>La más reciente refleja el estado actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {items.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/pacientes/${id}/lenguaje/${a.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 hover:text-primary"
                  >
                    <span>{formatDate(a.assessedAt)}</span>
                    <span className="tabular-nums text-sm text-muted-foreground">
                      Nominación {a.namingScore}/{NAMING_ITEM_COUNT} · Repetición {a.phraseScore}/
                      {REPETITION_PHRASES.length}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
