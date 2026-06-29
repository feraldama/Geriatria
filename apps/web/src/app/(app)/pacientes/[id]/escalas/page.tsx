"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, LineChart as LineChartIcon } from "lucide-react";
import {
  formatDate,
  SCALE_TYPES,
  SCALE_CATEGORIES,
  SCALE_DEFINITIONS,
  PERMISSIONS,
  scaleMaxScore,
  type AssessmentScaleItem,
  type ScaleType,
} from "@geriatria/schemas";
import { useScales } from "@/lib/scales";
import { usePatient } from "@/lib/patients";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { PatientSubHeader } from "@/components/patient-subheader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "@/components/ui/line-chart";
import { LEVEL_BADGE } from "@/lib/scale-ui";
import { cn } from "@/lib/utils";

export default function EscalasPage() {
  const { id } = useParams<{ id: string }>();
  const { data: scales, isLoading, isError } = useScales(id);
  const { data: patient } = usePatient(id);
  const sex = patient?.sex;
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);

  // Agrupa por tipo de escala.
  const byType = (scales ?? []).reduce<Record<string, AssessmentScaleItem[]>>((acc, s) => {
    (acc[s.type] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div>
        <h2 className="font-heading text-xl font-semibold">Escalas y valoración geriátrica</h2>
        <p className="text-sm text-muted-foreground">
          Las escalas son ayudas de cálculo, no diagnósticos; no sustituyen el criterio clínico.
        </p>
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">No se pudieron cargar las escalas.</Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {SCALE_CATEGORIES.map((category) => {
            const typesInCategory = SCALE_TYPES.filter(
              (t) => SCALE_DEFINITIONS[t].category === category,
            );
            return (
              <section key={category} className="flex flex-col gap-3">
                <h3 className="font-heading text-lg font-semibold text-muted-foreground">
                  {category}
                </h3>
                {typesInCategory.map((type: ScaleType) => {
                  const def = SCALE_DEFINITIONS[type];
                  // Registros de esta escala (la lista viene desc; para el gráfico
                  // los ordenamos ascendente por fecha).
                  const records = byType[type] ?? [];
                  const asc = [...records].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
                  const latest = records[0]; // más reciente
                  const points = asc.map((s) => ({ date: s.appliedAt, value: s.score }));

                  return (
                    <Card key={type}>
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{def.name}</CardTitle>
                    <CardDescription>{def.category}</CardDescription>
                  </div>
                  {canWrite && (
                    <Link
                      href={`/pacientes/${id}/escalas/aplicar/${type}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Aplicar
                    </Link>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {!latest ? (
                    <p className="text-muted-foreground">Sin registros.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-heading text-2xl font-semibold tabular-nums">
                          {latest.score}
                          <span className="text-base font-normal text-muted-foreground">
                            {" "}
                            / {latest.maxScore}
                          </span>
                        </span>
                        {latest.interpretation && (
                          <Badge variant={LEVEL_BADGE[def.interpret(latest.score, { sex }).level]}>
                            {latest.interpretation}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Último: {formatDate(latest.appliedAt)}
                        </span>
                      </div>

                      {points.length >= 2 ? (
                        <LineChart
                          points={points}
                          max={scaleMaxScore(def, sex)}
                          ariaLabel={`Evolución de ${def.name}`}
                        />
                      ) : (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <LineChartIcon className="h-4 w-4" aria-hidden />
                          Se grafica la evolución a partir de la segunda aplicación.
                        </p>
                      )}

                      {/* Historial de esta escala */}
                      <ul className="flex flex-col divide-y divide-border border-t border-border">
                        {records.map((s) => (
                          <li key={s.id}>
                            <Link
                              href={`/pacientes/${id}/escalas/${s.id}`}
                              className="flex items-center justify-between gap-2 py-2 text-sm hover:text-primary"
                            >
                              <span>{formatDate(s.appliedAt)}</span>
                              <span className="tabular-nums">
                                {s.score}/{s.maxScore}
                                {s.interpretation ? ` · ${s.interpretation}` : ""}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                      </CardContent>
                    </Card>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
