"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  formatDate,
  isValidDateString,
  NAMING_ITEM_COUNT,
  REPETITION_PHRASES,
  LAMINA_ESCENA,
  LAMINA_NOMINACION,
} from "@geriatria/schemas";
import { useApplyLanguage } from "@/lib/cognition";
import { ApiError } from "@/lib/api";
import { PatientSubHeader } from "@/components/patient-subheader";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { ErrorAlert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function EvaluarLenguajePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const apply = useApplyLanguage(id);

  const [date, setDate] = useState(formatDate(new Date()));
  const [naming, setNaming] = useState<boolean[]>(Array(NAMING_ITEM_COUNT).fill(false));
  const [phrases, setPhrases] = useState<boolean[]>(Array(REPETITION_PHRASES.length).fill(false));
  const [descriptionNotes, setDescriptionNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const namingScore = naming.filter(Boolean).length;
  const phraseScore = phrases.filter(Boolean).length;

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<boolean[]>>,
    index: number,
  ) => setter((prev) => prev.map((v, i) => (i === index ? !v : v)));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (!isValidDateString(date)) return;
    try {
      await apply.mutateAsync({
        date,
        naming,
        phrases,
        descriptionNotes: descriptionNotes.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast("Evaluación de lenguaje registrada");
      router.replace(`/pacientes/${id}/lenguaje`);
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
        href={`/pacientes/${id}/lenguaje`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a lenguaje y cognición
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
              htmlFor="lang-date"
              required
              hint="dd/mm/aaaa"
              error={showErrors && !isValidDateString(date) ? "Fecha inválida" : undefined}
            >
              <DateInput
                id="lang-date"
                value={date}
                onChange={setDate}
                invalid={showErrors && !isValidDateString(date)}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Nominación por confrontación */}
        <Card>
          <CardHeader>
            <CardTitle>Nominación de imágenes</CardTitle>
            <CardDescription>
              Mostrá la lámina al paciente y marcá los objetos que nombra correctamente.{" "}
              <span className="font-medium text-foreground tabular-nums">
                {namingScore}/{NAMING_ITEM_COUNT}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LAMINA_NOMINACION}
              alt="Lámina de nominación: 20 objetos numerados"
              className="w-full rounded-md border border-border"
            />
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {naming.map((on, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(setNaming, i)}
                  aria-pressed={on}
                  aria-label={`Objeto ${i + 1}${on ? " correcto" : ""}`}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-md border text-base font-medium tabular-nums transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Repetición de frases */}
        <Card>
          <CardHeader>
            <CardTitle>Repetición de frases</CardTitle>
            <CardDescription>
              Marcá las frases repetidas correctamente.{" "}
              <span className="font-medium text-foreground tabular-nums">
                {phraseScore}/{REPETITION_PHRASES.length}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {REPETITION_PHRASES.map((phrase, i) => (
              <label
                key={i}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-base transition-colors",
                  phrases[i]
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border hover:bg-muted",
                )}
              >
                <input
                  type="checkbox"
                  checked={phrases[i]}
                  onChange={() => toggle(setPhrases, i)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="flex-1">{phrase}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Descripción de escena */}
        <Card>
          <CardHeader>
            <CardTitle>Descripción de escena</CardTitle>
            <CardDescription>
              Mostrá la lámina y registrá la descripción del paciente (lenguaje espontáneo).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LAMINA_ESCENA}
              alt="Lámina de descripción de escena"
              className="w-full rounded-md border border-border"
            />
            <Field label="Observación / descripción" htmlFor="lang-desc">
              <Textarea
                id="lang-desc"
                rows={4}
                value={descriptionNotes}
                onChange={(e) => setDescriptionNotes(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas generales</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notas" />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/pacientes/${id}/lenguaje`)}
            disabled={apply.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={apply.isPending}>
            Guardar evaluación
          </Button>
        </div>
      </form>
    </div>
  );
}
