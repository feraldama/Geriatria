"use client";

import * as React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import {
  createPatientSchema,
  SEX,
  SEX_LABELS,
  type CreatePatientInput,
} from "@geriatria/schemas";
import { useCreatePatient } from "@/lib/patients";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { ErrorAlert } from "@/components/ui/alert";

// Solo los datos mínimos para dar de alta desde la agenda; la ficha completa
// se completa después desde Pacientes.
const quickCreateSchema = createPatientSchema.pick({
  firstName: true,
  lastName: true,
  documentId: true,
  birthDate: true,
  sex: true,
  phone: true,
});

interface FormValues {
  firstName: string;
  lastName: string;
  documentId: string;
  birthDate: string;
  sex: "" | (typeof SEX)[number];
  phone: string;
}

const cap = (w: string) => (w ? w[0]!.toUpperCase() + w.slice(1) : w);

// Precarga los campos a partir de lo que se venía buscando en el combobox:
// si parece un documento va a ese campo; si no, primera palabra → nombre y
// el resto → apellido (siempre editable).
function prefill(query: string): Pick<FormValues, "firstName" | "lastName" | "documentId"> {
  const q = query.trim();
  if (/^[\d.\-]+$/.test(q)) return { firstName: "", lastName: "", documentId: q };
  const parts = q.split(/\s+/).filter(Boolean);
  return {
    firstName: cap(parts[0] ?? ""),
    lastName: parts.slice(1).map(cap).join(" "),
    documentId: "",
  };
}

interface PatientQuickCreateProps {
  /** Texto que se estaba buscando; se usa para precargar los campos. */
  initialQuery?: string;
  onCreated: (patientId: string, patientName: string) => void;
  onCancel: () => void;
}

/**
 * Alta rápida de paciente para usar dentro de otro formulario (p. ej. la
 * cita). No renderiza un <form> propio (no se pueden anidar): el guardado se
 * dispara con el botón o con Enter, interceptado antes de que llegue al
 * formulario contenedor.
 */
export function PatientQuickCreate({ initialQuery = "", onCreated, onCancel }: PatientQuickCreateProps) {
  const { toast } = useToast();
  const create = useCreatePatient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(quickCreateSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    defaultValues: { ...prefill(initialQuery), birthDate: "", sex: "", phone: "" },
  });

  const submit = handleSubmit(async (data) => {
    try {
      const res = await create.mutateAsync({
        ...(data as unknown as CreatePatientInput),
        caregivers: [],
        conditions: [],
        allergies: [],
      });
      toast("Paciente creado");
      onCreated(res.patient.id, `${res.patient.lastName}, ${res.patient.firstName}`);
    } catch {
      /* el error se muestra abajo */
    }
  });

  const serverError =
    create.error instanceof ApiError
      ? create.error.message
      : create.error
        ? "No se pudo crear el paciente"
        : null;

  return (
    <div
      className="flex flex-col gap-4 rounded-md border border-border bg-muted/30 p-4"
      // Enter en un campo de texto guarda el paciente en lugar de enviar el
      // formulario contenedor (la cita, aún incompleta). Se acota a los inputs:
      // sobre un botón o un select, Enter debe hacer lo suyo.
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const target = e.target as HTMLElement;
        if (!(target instanceof HTMLInputElement)) return;
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" aria-hidden />
        <h3 className="font-heading font-semibold">Nuevo paciente</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Datos mínimos para agendar la cita. La ficha completa se puede completar
        después desde Pacientes.
      </p>

      {serverError && <ErrorAlert message={serverError} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="qc-firstName" required error={errors.firstName?.message}>
          <Input
            id="qc-firstName"
            autoFocus
            aria-invalid={!!errors.firstName}
            {...register("firstName")}
          />
        </Field>
        <Field label="Apellido" htmlFor="qc-lastName" required error={errors.lastName?.message}>
          <Input id="qc-lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
        </Field>
        <Field
          label="Fecha de nacimiento"
          htmlFor="qc-birthDate"
          required
          error={errors.birthDate?.message}
          hint="dd/mm/aaaa"
        >
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <DateInput
                id="qc-birthDate"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.birthDate}
              />
            )}
          />
        </Field>
        <Field label="Sexo" htmlFor="qc-sex" required error={errors.sex?.message}>
          <Select id="qc-sex" aria-invalid={!!errors.sex} {...register("sex")}>
            <option value="">Seleccionar…</option>
            {SEX.map((v) => (
              <option key={v} value={v}>
                {SEX_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Documento de identidad" htmlFor="qc-documentId" error={errors.documentId?.message}>
          <Input id="qc-documentId" {...register("documentId")} />
        </Field>
        <Field label="Teléfono" htmlFor="qc-phone" error={errors.phone?.message}>
          <Input id="qc-phone" type="tel" {...register("phone")} />
        </Field>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={create.isPending}>
          Volver a buscar
        </Button>
        <Button type="button" size="sm" loading={create.isPending} onClick={() => void submit()}>
          Crear y seleccionar
        </Button>
      </div>
    </div>
  );
}
