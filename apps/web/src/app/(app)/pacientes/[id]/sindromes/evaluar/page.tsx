"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatDate, isValidDateString, GERIATRIC_SYNDROMES } from "@geriatria/schemas";
import { useSyndromes, useApplySyndrome } from "@/lib/syndromes";
import { ApiError } from "@/lib/api";
import { PatientSubHeader } from "@/components/patient-subheader";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { ErrorAlert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function EvaluarSindromesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const apply = useApplySyndrome(id);
  const { data: assessments } = useSyndromes(id);

  const [present, setPresent] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(formatDate(new Date()));
  const [notes, setNotes] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Precarga el estado de la última evaluación para editarlo (no partir de cero
  // en cada consulta). Solo una vez, cuando llegan los datos.
  useEffect(() => {
    if (prefilled || !assessments) return;
    const latest = assessments[0];
    if (latest) setPresent(new Set(latest.present));
    setPrefilled(true);
  }, [assessments, prefilled]);

  function toggle(key: string) {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (!isValidDateString(date)) return;
    try {
      await apply.mutateAsync({
        date,
        present: [...present],
        notes: notes.trim() || undefined,
      });
      toast("Evaluación de síndromes registrada");
      router.replace(`/pacientes/${id}/sindromes`);
    } catch {
      /* error abajo */
    }
  }

  const serverError =
    apply.error instanceof ApiError
      ? apply.error.message
      : apply.error
        ? "No se pudo registrar la evaluación"
        : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PatientSubHeader patientId={id} />
      <Link
        href={`/pacientes/${id}/sindromes`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a síndromes
      </Link>

      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        {serverError && <ErrorAlert message={serverError} />}

        <Card>
          <CardHeader>
            <CardTitle>Datos de la evaluación</CardTitle>
          </CardHeader>
          <CardContent>
            <Field
              label="Fecha de evaluación"
              htmlFor="syn-date"
              required
              hint="dd/mm/aaaa"
              error={showErrors && !isValidDateString(date) ? "Fecha inválida" : undefined}
            >
              <DateInput
                id="syn-date"
                value={date}
                onChange={setDate}
                invalid={showErrors && !isValidDateString(date)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Síndromes presentes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5 sm:grid-cols-2">
            {GERIATRIC_SYNDROMES.map((s) => {
              const on = present.has(s.key);
              return (
                <label
                  key={s.key}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-base transition-colors",
                    on ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(s.key)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1">{s.label}</span>
                </label>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notas" />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
          <span className="text-base font-medium">
            {present.size} de {GERIATRIC_SYNDROMES.length} marcados
          </span>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/pacientes/${id}/sindromes`)}
              disabled={apply.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={apply.isPending}>
              Guardar evaluación
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
