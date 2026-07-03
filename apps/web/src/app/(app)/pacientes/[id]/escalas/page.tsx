"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, LineChart as LineChartIcon, Languages, ArrowRight } from "lucide-react";
import {
  formatDate,
  SCALE_GROUPS,
  SCALE_DEFINITIONS,
  PERMISSIONS,
  scaleMaxScore,
  type AssessmentScaleItem,
  type ScaleContext,
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

  // Agrupa los registros por tipo de escala.
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
          Organizadas por las cuatro esferas de la valoración geriátrica integral. Las escalas son
          ayudas de cálculo, no diagnósticos; no sustituyen el criterio clínico.
        </p>
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">No se pudieron cargar las escalas.</Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-10">
          {SCALE_GROUPS.map((group) => (
            <section key={group.sphere} className="flex flex-col gap-5">
              <h3 className="font-heading border-b border-border pb-1 text-lg font-semibold">
                {group.sphere}
              </h3>

              {group.categories.map((cat) => (
                <div key={cat.category} className="flex flex-col gap-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {cat.category}
                  </h4>
                  {cat.types.map((type) => (
                    <ScaleCard
                      key={type}
                      type={type}
                      patientId={id}
                      records={byType[type] ?? []}
                      canWrite={canWrite}
                      ctx={{
                        sex,
                        education: patient?.education,
                        educationYears: patient?.educationYears,
                      }}
                    />
                  ))}
                </div>
              ))}

              {/* En Cognición, enlace al módulo de lenguaje con láminas
                  (nominación por confrontación y repetición de frases). */}
              {group.sphere === "Cognición" && (
                <Link
                  href={`/pacientes/${id}/lenguaje`}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <Languages className="h-5 w-5 text-primary" aria-hidden />
                  <span className="flex-1">
                    <span className="font-medium">Lenguaje (con láminas)</span> — nominación por
                    confrontación de imágenes y repetición de frases, con las láminas de la doctora.
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Link>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ScaleCard({
  type,
  patientId,
  records,
  canWrite,
  ctx,
}: {
  type: ScaleType;
  patientId: string;
  records: AssessmentScaleItem[];
  canWrite: boolean;
  ctx: ScaleContext;
}) {
  const def = SCALE_DEFINITIONS[type];
  const sex = ctx.sex;
  // La lista viene desc; para el gráfico la ordenamos ascendente por fecha.
  const asc = [...records].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
  const latest = records[0]; // más reciente
  const points = asc.map((s) => ({ date: s.appliedAt, value: s.score }));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{def.name}</CardTitle>
          <CardDescription>{def.description}</CardDescription>
        </div>
        {canWrite && (
          <Link
            href={`/pacientes/${patientId}/escalas/aplicar/${type}`}
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
                <Badge variant={LEVEL_BADGE[def.interpret(latest.score, ctx).level]}>
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
                    href={`/pacientes/${patientId}/escalas/${s.id}`}
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
}
