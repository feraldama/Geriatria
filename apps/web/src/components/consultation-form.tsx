"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  consultationSchema,
  formatDate,
  formatTime,
  calculateBMI,
  type ConsultationInput,
  type ConsultationItem,
} from "@geriatria/schemas";
import { useCreateConsultation, useUpdateConsultation } from "@/lib/clinical";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { TimeInput } from "@/components/ui/time-input";
import { ErrorAlert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scrollToFirstError } from "@/lib/scroll-to-error";

interface VitalsValues {
  systolic: string;
  diastolic: string;
  heartRate: string;
  respiratoryRate: string;
  temperature: string;
  oxygenSat: string;
  weight: string;
  height: string;
  calfCircumference: string;
  bloodGlucose: string;
  gripStrength: string;
}
interface FormValues {
  date: string;
  time: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals: VitalsValues;
}

const emptyVitals: VitalsValues = {
  systolic: "",
  diastolic: "",
  heartRate: "",
  respiratoryRate: "",
  temperature: "",
  oxygenSat: "",
  weight: "",
  height: "",
  calfCircumference: "",
  bloodGlucose: "",
  gripStrength: "",
};

interface ConsultationFormProps {
  patientId: string;
  appointmentId?: string; // si la consulta nace de una cita
  initial?: ConsultationItem; // presente => modo edición (SOAP + fecha)
}

export function ConsultationForm({ patientId, appointmentId, initial }: ConsultationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!initial;
  const create = useCreateConsultation(patientId);
  const update = useUpdateConsultation(patientId, initial?.id ?? "");
  const mutation = isEdit ? update : create;

  const now = new Date();
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(consultationSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: initial
      ? {
          date: formatDate(initial.date),
          time: formatTime(initial.date),
          subjective: initial.subjective ?? "",
          objective: initial.objective ?? "",
          assessment: initial.assessment ?? "",
          plan: initial.plan ?? "",
          vitals: emptyVitals,
        }
      : {
          date: formatDate(now),
          time: formatTime(now),
          subjective: "",
          objective: "",
          assessment: "",
          plan: "",
          vitals: emptyVitals,
        },
  });

  // Vista previa del IMC en vivo a partir de peso y talla.
  const weight = Number(watch("vitals.weight")) || null;
  const height = Number(watch("vitals.height")) || null;
  const bmi = calculateBMI(weight, height);

  const submit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        // En edición solo se actualiza el SOAP y la fecha (los vitales se
        // gestionan en su propia sección).
        const { vitals: _vitals, ...soap } = data;
        void _vitals;
        await update.mutateAsync(soap as unknown as ConsultationInput);
        toast("Consulta actualizada");
        router.replace(`/pacientes/${patientId}/consultas/${initial!.id}`);
      } else {
        const payload = {
          ...data,
          appointmentId: appointmentId ?? null,
        } as unknown as ConsultationInput;
        const res = await create.mutateAsync(payload);
        toast("Consulta registrada");
        router.replace(`/pacientes/${patientId}/consultas/${res.consultation.id}`);
      }
    } catch {
      /* error abajo */
    }
  }, () => scrollToFirstError());

  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "No se pudo guardar la consulta"
        : null;

  const vitalNum = (name: keyof VitalsValues, label: string, unit: string, step?: string) => (
    <Field label={`${label}${unit ? ` (${unit})` : ""}`} htmlFor={`v-${name}`}>
      <Input
        id={`v-${name}`}
        type="number"
        inputMode="decimal"
        step={step}
        {...register(`vitals.${name}`)}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {serverError && <ErrorAlert message={serverError} />}
      {appointmentId && (
        <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          Esta consulta quedará vinculada a la cita seleccionada y la marcará como atendida.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fecha de la consulta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha" htmlFor="date" required error={errors.date?.message} hint="dd/mm/aaaa">
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DateInput id="date" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.date} />
              )}
            />
          </Field>
          <Field label="Hora" htmlFor="time" error={errors.time?.message} hint="24h (opcional)">
            <Controller
              control={control}
              name="time"
              render={({ field }) => (
                <TimeInput id="time" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.time} />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      {/* SOAP */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución (SOAP)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Subjetivo" htmlFor="subjective" hint="Relato y síntomas referidos por el paciente">
            <Textarea id="subjective" rows={3} {...register("subjective")} />
          </Field>
          <Field label="Objetivo" htmlFor="objective" hint="Examen físico y hallazgos">
            <Textarea id="objective" rows={3} {...register("objective")} />
          </Field>
          <Field label="Análisis / Evaluación" htmlFor="assessment">
            <Textarea id="assessment" rows={3} {...register("assessment")} />
          </Field>
          <Field label="Plan" htmlFor="plan" hint="Indicaciones, estudios y próximos controles">
            <Textarea id="plan" rows={3} {...register("plan")} />
          </Field>
        </CardContent>
      </Card>

      {/* Signos vitales (opcional) — solo al crear; en edición se gestionan
          desde la sección de signos vitales del paciente. */}
      {!isEdit && (
      <Card>
        <CardHeader>
          <CardTitle>Signos vitales (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {vitalNum("systolic", "PA sistólica", "mmHg")}
          {vitalNum("diastolic", "PA diastólica", "mmHg")}
          {vitalNum("heartRate", "FC", "lpm")}
          {vitalNum("respiratoryRate", "FR", "rpm")}
          {vitalNum("temperature", "Tº", "°C", "0.1")}
          {vitalNum("oxygenSat", "SatO₂", "%")}
          {vitalNum("weight", "Peso", "kg", "0.1")}
          {vitalNum("height", "Talla", "cm", "0.1")}
          {vitalNum("calfCircumference", "C. pantorrilla", "cm", "0.1")}
          {vitalNum("bloodGlucose", "Glicemia capilar", "mg/dL")}
          {vitalNum("gripStrength", "Fuerza de agarre", "kg", "0.1")}
          <Field label="IMC (calculado)" htmlFor="v-bmi">
            <Input id="v-bmi" value={bmi ?? ""} readOnly placeholder="—" className="bg-muted/40" />
          </Field>
        </CardContent>
      </Card>
      )}

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/pacientes/${patientId}/consultas`)}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Registrar consulta"}
        </Button>
      </div>
    </form>
  );
}
