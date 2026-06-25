"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vaccinationSchema,
  formatDate,
  COMMON_VACCINES,
  type VaccinationInput,
  type VaccinationItem,
} from "@geriatria/schemas";
import { useCreateVaccination, useUpdateVaccination } from "@/lib/extras";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { ErrorAlert } from "@/components/ui/alert";
import { scrollToFirstError } from "@/lib/scroll-to-error";

interface FormValues {
  vaccine: string;
  doseDate: string;
  nextDoseDate: string;
  notes: string;
}

export function VaccinationForm({
  patientId,
  initial,
  onSuccess,
  onCancel,
}: {
  patientId: string;
  initial?: VaccinationItem;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const create = useCreateVaccination(patientId);
  const update = useUpdateVaccination(patientId, initial?.id ?? "");
  const mutation = isEdit ? update : create;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(vaccinationSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: initial
      ? {
          vaccine: initial.vaccine,
          doseDate: initial.doseDate ? formatDate(initial.doseDate) : "",
          nextDoseDate: initial.nextDoseDate ? formatDate(initial.nextDoseDate) : "",
          notes: initial.notes ?? "",
        }
      : { vaccine: "", doseDate: "", nextDoseDate: "", notes: "" },
  });

  const submit = handleSubmit(async (data) => {
    try {
      const payload = data as unknown as VaccinationInput;
      if (isEdit) {
        await update.mutateAsync(payload);
        toast("Vacuna actualizada");
      } else {
        await create.mutateAsync(payload);
        toast("Vacuna registrada");
      }
      onSuccess();
    } catch {
      /* error abajo */
    }
  }, () => scrollToFirstError());

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? "No se pudo guardar" : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}

      <Field label="Vacuna" htmlFor="vac-name" required error={errors.vaccine?.message}>
        <Input id="vac-name" list="vaccine-suggestions" aria-invalid={!!errors.vaccine} {...register("vaccine")} />
        <datalist id="vaccine-suggestions">
          {COMMON_VACCINES.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de aplicación" htmlFor="vac-dose" hint="dd/mm/aaaa" error={errors.doseDate?.message}>
          <Controller control={control} name="doseDate" render={({ field }) => (
            <DateInput id="vac-dose" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.doseDate} />
          )} />
        </Field>
        <Field label="Próxima dosis" htmlFor="vac-next" hint="dd/mm/aaaa (opcional)" error={errors.nextDoseDate?.message}>
          <Controller control={control} name="nextDoseDate" render={({ field }) => (
            <DateInput id="vac-next" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.nextDoseDate} />
          )} />
        </Field>
      </div>

      <Field label="Notas" htmlFor="vac-notes" error={errors.notes?.message}>
        <Textarea id="vac-notes" {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Registrar vacuna"}
        </Button>
      </div>
    </form>
  );
}
