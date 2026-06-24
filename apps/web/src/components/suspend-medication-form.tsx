"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  suspendMedicationSchema,
  formatDate,
  type SuspendMedicationInput,
} from "@geriatria/schemas";
import { useSuspendMedication } from "@/lib/medications";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { ErrorAlert } from "@/components/ui/alert";
import { scrollToFirstError } from "@/lib/scroll-to-error";

interface FormValues {
  suspendedReason: string;
  suspendedDate: string;
}

export function SuspendMedicationForm({
  patientId,
  medicationId,
  onSuccess,
  onCancel,
}: {
  patientId: string;
  medicationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const suspend = useSuspendMedication(patientId);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(suspendMedicationSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: { suspendedReason: "", suspendedDate: formatDate(new Date()) },
  });

  const submit = handleSubmit(async (data) => {
    try {
      await suspend.mutateAsync({ mid: medicationId, data: data as unknown as SuspendMedicationInput });
      toast("Medicamento suspendido");
      onSuccess();
    } catch {
      /* error abajo */
    }
  }, () => scrollToFirstError());

  const serverError =
    suspend.error instanceof ApiError
      ? suspend.error.message
      : suspend.error
        ? "No se pudo suspender"
        : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}
      <Field label="Motivo de suspensión" htmlFor="s-reason" required error={errors.suspendedReason?.message}>
        <Textarea id="s-reason" rows={3} aria-invalid={!!errors.suspendedReason} {...register("suspendedReason")} />
      </Field>
      <Field label="Fecha de suspensión" htmlFor="s-date" hint="dd/mm/aaaa" error={errors.suspendedDate?.message}>
        <Controller
          control={control}
          name="suspendedDate"
          render={({ field }) => (
            <DateInput id="s-date" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.suspendedDate} />
          )}
        />
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={suspend.isPending}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" loading={suspend.isPending}>
          Suspender
        </Button>
      </div>
    </form>
  );
}
