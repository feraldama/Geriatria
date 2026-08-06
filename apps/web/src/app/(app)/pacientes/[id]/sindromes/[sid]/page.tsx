"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Minus } from "lucide-react";
import { formatDate, GERIATRIC_SYNDROMES, GDS_FAST_STAGES } from "@geriatria/schemas";
import { useSyndrome } from "@/lib/syndromes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function SindromeDetallePage() {
  const { id, sid } = useParams<{ id: string; sid: string }>();
  const { data: assessment, isLoading, isError } = useSyndrome(id, sid);

  if (isLoading) return <SkeletonText lines={6} className="p-6" />;
  if (isError || !assessment)
    return <p className="p-6 text-destructive">No se pudo cargar la evaluación.</p>;

  const present = new Set(assessment.present);
  const gds = assessment.gdsStage != null
    ? GDS_FAST_STAGES.find((g) => g.stage === assessment.gdsStage)
    : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={`/pacientes/${id}/sindromes`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a síndromes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Síndromes geriátricos</h1>
          <p className="text-muted-foreground">Evaluado el {formatDate(assessment.assessedAt)}</p>
        </div>
        <Badge variant={present.size ? "destructive" : "outline"}>
          {present.size} de {GERIATRIC_SYNDROMES.length} presentes
        </Badge>
      </div>

      <Card>
        <CardContent className="p-6">
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
        </CardContent>
      </Card>

      {gds && (
        <Card>
          <CardHeader>
            <CardTitle>Escala de Deterioro Global (GDS-FAST)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" className="text-base">
                GDS {gds.stage}
              </Badge>
              <span className="font-medium">{gds.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {gds.phase} · MEC {gds.mec}
            </p>
            <p className="text-sm text-muted-foreground">{gds.summary}</p>
          </CardContent>
        </Card>
      )}

      {assessment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{assessment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
