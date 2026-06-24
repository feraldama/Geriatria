"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAppointmentSchema,
  formatDate,
  formatTime,
  APPOINTMENT_TYPE,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  DURATION_OPTIONS,
  type AppointmentItem,
  type AppointmentType,
  type AppointmentStatus,
  type CreateAppointmentInput,
} from "@geriatria/schemas";
import { useCreateAppointment, useUpdateAppointment } from "@/lib/appointments";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PatientCombobox } from "@/components/patient-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { TimeInput } from "@/components/ui/time-input";
import { ErrorAlert } from "@/components/ui/alert";
import { scrollToFirstError } from "@/lib/scroll-to-error";

interface FormValues {
  patientId: string;
  patientName: string; // solo para mostrar en el combobox (no se envía)
  date: string;
  time: string;
  durationMin: string;
  type: AppointmentType;
  status: AppointmentStatus;
  reason: string;
  notes: string;
}

interface AppointmentFormProps {
  initial?: AppointmentItem;
  defaultDate?: string; // dd/mm/aaaa al crear desde un día del calendario
  onSuccess: () => void;
  onCancel: () => void;
}

export function AppointmentForm({ initial, defaultDate, onSuccess, onCancel }: AppointmentFormProps) {
  const { toast } = useToast();
  const create = useCreateAppointment();
  const update = useUpdateAppointment(initial?.id ?? "");
  const isEdit = !!initial;

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createAppointmentSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: initial
      ? {
          patientId: initial.patientId,
          patientName: initial.patientName,
          date: formatDate(initial.scheduledAt),
          time: formatTime(initial.scheduledAt),
          durationMin: String(initial.durationMin),
          type: initial.type,
          status: initial.status,
          reason: initial.reason ?? "",
          notes: initial.notes ?? "",
        }
      : {
          patientId: "",
          patientName: "",
          date: defaultDate ?? "",
          time: "",
          durationMin: "30",
          type: "CONTROL",
          status: "PROGRAMADA",
          reason: "",
          notes: "",
        },
  });

  const submit = handleSubmit(async (data) => {
    try {
      const payload = data as unknown as CreateAppointmentInput;
      if (isEdit) {
        await update.mutateAsync(payload);
        toast("Cita actualizada");
      } else {
        await create.mutateAsync(payload);
        toast("Cita agendada");
      }
      onSuccess();
    } catch {
      /* el error se muestra abajo */
    }
  }, () => scrollToFirstError());

  const mutation = isEdit ? update : create;
  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "No se pudo guardar la cita"
        : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}

      <Field label="Paciente" htmlFor="patientId" required error={errors.patientId?.message}>
        <Controller
          control={control}
          name="patientId"
          render={() => (
            <PatientCombobox
              id="patientId"
              value={watch("patientId")}
              selectedName={watch("patientName")}
              invalid={!!errors.patientId}
              onChange={(pid, name) => {
                setValue("patientId", pid, { shouldValidate: true });
                setValue("patientName", name);
              }}
            />
          )}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fecha" htmlFor="date" required error={errors.date?.message} hint="dd/mm/aaaa">
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <DateInput
                id="date"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.date}
              />
            )}
          />
        </Field>
        <Field label="Hora" htmlFor="time" required error={errors.time?.message} hint="24h">
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <TimeInput
                id="time"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.time}
              />
            )}
          />
        </Field>
        <Field label="Duración" htmlFor="durationMin" error={errors.durationMin?.message}>
          <Select id="durationMin" {...register("durationMin")}>
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="type" required error={errors.type?.message}>
          <Select id="type" {...register("type")}>
            {APPOINTMENT_TYPE.map((t) => (
              <option key={t} value={t}>
                {APPOINTMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estado" htmlFor="status" error={errors.status?.message}>
          <Select id="status" {...register("status")}>
            {APPOINTMENT_STATUS.map((s) => (
              <option key={s} value={s}>
                {APPOINTMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Motivo" htmlFor="reason" error={errors.reason?.message}>
        <Input id="reason" {...register("reason")} placeholder="Motivo de la consulta" />
      </Field>

      <Field label="Notas" htmlFor="notes" error={errors.notes?.message}>
        <Textarea id="notes" {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Agendar cita"}
        </Button>
      </div>
    </form>
  );
}
