"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { formatDate, NAMING_ITEM_COUNT, REPETITION_PHRASES } from "@geriatria/schemas";
import { useLanguageAssessment } from "@/lib/cognition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function LenguajeDetallePage() {
  const { id, lid } = useParams<{ id: string; lid: string }>();
  const { data: a, isLoading, isError } = useLanguageAssessment(id, lid);

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (isError || !a) return <p className="p-6 text-destructive">No se pudo cargar la evaluación.</p>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={`/pacientes/${id}/lenguaje`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a lenguaje y cognición
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-semibold">Lenguaje y cognición</h1>
        <p className="text-muted-foreground">Evaluado el {formatDate(a.assessedAt)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            Nominación de imágenes
            <Badge variant="primary">
              {a.namingScore}/{NAMING_ITEM_COUNT}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {a.naming.map((on, i) => (
              <span
                key={i}
                className={cn(
                  "flex h-10 items-center justify-center gap-1 rounded-md border text-sm tabular-nums",
                  on
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {i + 1}
                {on ? <Check className="h-3 w-3 text-primary" /> : <X className="h-3 w-3" />}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            Repetición de frases
            <Badge variant="primary">
              {a.phraseScore}/{REPETITION_PHRASES.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {REPETITION_PHRASES.map((phrase, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className={cn(a.phrases[i] ? "text-foreground" : "text-muted-foreground")}>
                  {phrase}
                </span>
                {a.phrases[i] ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Correcta" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Incorrecta" />
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {a.descriptionNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Descripción de escena</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">{a.descriptionNotes}</p>
          </CardContent>
        </Card>
      )}

      {a.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas generales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">{a.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
