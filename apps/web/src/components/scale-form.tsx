"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatDate,
  isValidDateString,
  type ScaleAnswers,
  type ScaleDefinition,
} from "@geriatria/schemas";
import { useApplyScale } from "@/lib/scales";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { ErrorAlert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ScaleForm({ patientId, def }: { patientId: string; def: ScaleDefinition }) {
  const router = useRouter();
  const { toast } = useToast();
  const apply = useApplyScale(patientId);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [date, setDate] = useState(formatDate(new Date()));
  const [notes, setNotes] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const answeredCount = def.questions.filter((q) => answers[q.id] !== undefined).length;
  const complete = answeredCount === def.questions.length;
  const partialScore = Object.values(answers).reduce((a, b) => a + b, 0);

  function setAnswer(qid: string, value: number) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (!complete || !isValidDateString(date)) return;
    try {
      const res = await apply.mutateAsync({
        type: def.type,
        date,
        answers: answers as ScaleAnswers,
        notes: notes.trim() || undefined,
      });
      toast(`${def.name} registrada`);
      router.replace(`/pacientes/${patientId}/escalas/${res.scale.id}`);
    } catch {
      /* error abajo */
    }
  }

  const serverError =
    apply.error instanceof ApiError
      ? apply.error.message
      : apply.error
        ? "No se pudo registrar la escala"
        : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {serverError && <ErrorAlert message={serverError} />}
      {showErrors && !complete && (
        <ErrorAlert message="Respondé todos los ítems antes de guardar." />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos de la aplicación</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            label="Fecha de aplicación"
            htmlFor="scale-date"
            required
            hint="dd/mm/aaaa"
            error={showErrors && !isValidDateString(date) ? "Fecha inválida" : undefined}
          >
            <DateInput
              id="scale-date"
              value={date}
              onChange={setDate}
              invalid={showErrors && !isValidDateString(date)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{def.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {def.questions.map((q, idx) => {
            const value = answers[q.id];
            const missing = showErrors && value === undefined;
            return (
              <fieldset key={q.id} className={cn("flex flex-col gap-2", missing && "rounded-md")}>
                <legend className="mb-1 font-medium">
                  {idx + 1}. {q.text}
                  {q.kind === "range" && (
                    <span className="text-muted-foreground"> (0–{q.max})</span>
                  )}
                </legend>

                {q.kind === "options" ? (
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-base transition-colors",
                          value === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={value === opt.value}
                          onChange={() => setAnswer(q.id, opt.value)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="flex-1">{opt.label}</span>
                        <span className="tabular-nums text-sm text-muted-foreground">{opt.value}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  // Rango: botones 0..max para elegir los puntos de la sección.
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: q.max + 1 }, (_, n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswer(q.id, n)}
                        aria-pressed={value === n}
                        className={cn(
                          "min-h-11 min-w-11 rounded-md border text-base tabular-nums transition-colors focus-visible:outline-none",
                          value === n
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                {missing && <p className="text-sm text-destructive">Seleccioná una opción.</p>}
              </fieldset>
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

      {/* Barra fija con puntaje en vivo + guardar */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <div>
          <span className="font-heading text-xl font-semibold tabular-nums">
            {partialScore}
            <span className="text-base font-normal text-muted-foreground"> / {def.maxScore}</span>
          </span>
          <span className="ml-3 text-sm text-muted-foreground">
            {complete
              ? def.interpret(partialScore)
              : `${answeredCount}/${def.questions.length} ítems respondidos`}
          </span>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/pacientes/${patientId}/escalas`)}
            disabled={apply.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={apply.isPending} disabled={!complete}>
            Guardar escala
          </Button>
        </div>
      </div>
    </form>
  );
}
