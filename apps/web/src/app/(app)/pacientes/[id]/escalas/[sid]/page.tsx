"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatDate, getScaleDefinition } from "@geriatria/schemas";
import { useScale } from "@/lib/scales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EscalaDetallePage() {
  const { id, sid } = useParams<{ id: string; sid: string }>();
  const { data: scale, isLoading, isError } = useScale(id, sid);

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (isError || !scale) return <p className="p-6 text-destructive">No se pudo cargar la escala.</p>;

  const def = getScaleDefinition(scale.type);

  // Etiqueta legible de cada respuesta según la definición de la escala.
  function answerLabel(qid: string): { text: string; value: number } | null {
    if (!def) return null;
    const q = def.questions.find((x) => x.id === qid);
    const value = scale!.answers?.[qid];
    if (!q || value === undefined) return null;
    if (q.kind === "options") {
      const opt = q.options.find((o) => o.value === value);
      return { text: `${q.text}: ${opt?.label ?? value}`, value };
    }
    return { text: `${q.text}`, value };
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={`/pacientes/${id}/escalas`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a escalas
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-semibold">{def?.name ?? scale.type}</h1>
        <p className="text-muted-foreground">Aplicada el {formatDate(scale.appliedAt)}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-6">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {scale.score}
            <span className="text-lg font-normal text-muted-foreground"> / {scale.maxScore}</span>
          </span>
          {scale.interpretation && <Badge variant="primary">{scale.interpretation}</Badge>}
        </CardContent>
      </Card>

      {def && scale.answers && (
        <Card>
          <CardHeader>
            <CardTitle>Respuestas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {def.questions.map((q) => {
                const a = answerLabel(q.id);
                if (!a) return null;
                return (
                  <li key={q.id} className="flex items-center justify-between gap-3 py-2">
                    <span>{a.text}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{a.value}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {scale.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{scale.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
