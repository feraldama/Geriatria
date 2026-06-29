"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vitalSignSchema,
  formatDate,
  formatTime,
  calculateBMI,
  type VitalSignInput,
} from "@geriatria/schemas";
import { useCreateVital } from "@/lib/clinical";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { TimeInput } from "@/components/ui/time-input";
import { ErrorAlert } from "@/components/ui/alert";
import { scrollToFirstError } from "@/lib/scroll-to-error";

interface FormValues {
  date: string;
  time: string;
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
  notes: string;
}

export function VitalsForm({
  patientId,
  onSuccess,
  onCancel,
}: {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const create = useCreateVital(patientId);
  const now = new Date();

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(vitalSignSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: {
      date: formatDate(now),
      time: formatTime(now),
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
      notes: "",
    },
  });

  const bmi = calculateBMI(Number(watch("weight")) || null, Number(watch("height")) || null);

  const submit = handleSubmit(async (data) => {
    try {
      await create.mutateAsync(data as unknown as VitalSignInput);
      toast("Signos vitales registrados");
      onSuccess();
    } catch {
      /* error abajo */
    }
  }, () => scrollToFirstError());

  const serverError =
    create.error instanceof ApiError
      ? create.error.message
      : create.error
        ? "No se pudieron guardar los signos vitales"
        : null;

  const num = (name: keyof FormValues, label: string, unit: string, step?: string) => (
    <Field
      label={`${label}${unit ? ` (${unit})` : ""}`}
      htmlFor={`vf-${name}`}
      error={errors[name]?.message}
    >
      <Input id={`vf-${name}`} type="number" inputMode="decimal" step={step} {...register(name)} />
    </Field>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha" htmlFor="vf-date" required error={errors.date?.message} hint="dd/mm/aaaa">
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <DateInput id="vf-date" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.date} />
            )}
          />
        </Field>
        <Field label="Hora" htmlFor="vf-time" error={errors.time?.message} hint="24h (opcional)">
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <TimeInput id="vf-time" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.time} />
            )}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {num("systolic", "PA sistólica", "mmHg")}
        {num("diastolic", "PA diastólica", "mmHg")}
        {num("heartRate", "FC", "lpm")}
        {num("respiratoryRate", "FR", "rpm")}
        {num("temperature", "Tº", "°C", "0.1")}
        {num("oxygenSat", "SatO₂", "%")}
        {num("weight", "Peso", "kg", "0.1")}
        {num("height", "Talla", "cm", "0.1")}
        {num("calfCircumference", "C. pantorrilla", "cm", "0.1")}
        {num("bloodGlucose", "Glicemia capilar", "mg/dL")}
        {num("gripStrength", "Fuerza de agarre", "kg", "0.1")}
        <Field label="IMC (calculado)" htmlFor="vf-bmi">
          <Input id="vf-bmi" value={bmi ?? ""} readOnly placeholder="—" className="bg-muted/40" />
        </Field>
      </div>

      <Field label="Notas" htmlFor="vf-notes" error={errors.notes?.message}>
        <Input id="vf-notes" {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={create.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending}>
          Guardar medición
        </Button>
      </div>
    </form>
  );
}
