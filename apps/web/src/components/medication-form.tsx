"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createMedicationSchema,
  formatDate,
  MEDICATION_ROUTE,
  MEDICATION_ROUTE_LABELS,
  type CreateMedicationInput,
  type MedicationItem,
  type MedicationRoute,
} from "@geriatria/schemas";
import { useCreateMedication, useUpdateMedication } from "@/lib/medications";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { ErrorAlert } from "@/components/ui/alert";

interface FormValues {
  drug: string;
  dose: string;
  frequency: string;
  route: "" | MedicationRoute;
  startDate: string;
  prescribedBy: string;
  alertNote: string;
  notes: string;
}

interface MedicationFormProps {
  patientId: string;
  initial?: MedicationItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MedicationForm({ patientId, initial, onSuccess, onCancel }: MedicationFormProps) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const create = useCreateMedication(patientId);
  const update = useUpdateMedication(patientId, initial?.id ?? "");
  const mutation = isEdit ? update : create;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createMedicationSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    defaultValues: initial
      ? {
          drug: initial.drug,
          dose: initial.dose ?? "",
          frequency: initial.frequency ?? "",
          route: initial.route ?? "",
          startDate: initial.startDate ? formatDate(initial.startDate) : "",
          prescribedBy: initial.prescribedBy ?? "",
          alertNote: initial.alertNote ?? "",
          notes: initial.notes ?? "",
        }
      : {
          drug: "",
          dose: "",
          frequency: "",
          route: "",
          startDate: "",
          prescribedBy: "",
          alertNote: "",
          notes: "",
        },
  });

  const submit = handleSubmit(async (data) => {
    try {
      const payload = data as unknown as CreateMedicationInput;
      if (isEdit) {
        await update.mutateAsync(payload);
        toast("Medicamento actualizado");
      } else {
        await create.mutateAsync(payload);
        toast("Medicamento agregado");
      }
      onSuccess();
    } catch {
      /* error abajo */
    }
  });

  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "No se pudo guardar el medicamento"
        : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}

      <Field label="Fármaco" htmlFor="m-drug" required error={errors.drug?.message}>
        <Input id="m-drug" aria-invalid={!!errors.drug} {...register("drug")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dosis" htmlFor="m-dose" hint="ej. 10 mg" error={errors.dose?.message}>
          <Input id="m-dose" {...register("dose")} />
        </Field>
        <Field label="Frecuencia" htmlFor="m-freq" hint="ej. cada 8 h" error={errors.frequency?.message}>
          <Input id="m-freq" {...register("frequency")} />
        </Field>
        <Field label="Vía" htmlFor="m-route" error={errors.route?.message}>
          <Select id="m-route" {...register("route")}>
            <option value="">Seleccionar…</option>
            {MEDICATION_ROUTE.map((r) => (
              <option key={r} value={r}>
                {MEDICATION_ROUTE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha de inicio" htmlFor="m-start" hint="dd/mm/aaaa" error={errors.startDate?.message}>
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <DateInput id="m-start" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.startDate} />
            )}
          />
        </Field>
        <Field label="Indicado por" htmlFor="m-by" className="sm:col-span-2" error={errors.prescribedBy?.message}>
          <Input id="m-by" {...register("prescribedBy")} />
        </Field>
      </div>

      <Field
        label="Alerta / interacción (manual)"
        htmlFor="m-alert"
        hint="Se resalta en rojo en la conciliación"
        error={errors.alertNote?.message}
      >
        <Input id="m-alert" {...register("alertNote")} />
      </Field>

      <Field label="Notas" htmlFor="m-notes" error={errors.notes?.message}>
        <Textarea id="m-notes" {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Agregar medicamento"}
        </Button>
      </div>
    </form>
  );
}
