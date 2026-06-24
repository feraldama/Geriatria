"use client";

import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import {
  createPatientSchema,
  formatDate,
  SEX,
  SEX_LABELS,
  MARITAL_STATUS,
  MARITAL_STATUS_LABELS,
  DEPENDENCY_LEVEL,
  DEPENDENCY_LEVEL_LABELS,
  HABIT_STATUS,
  HABIT_STATUS_LABELS,
  ALLERGY_SEVERITY,
  ALLERGY_SEVERITY_LABELS,
  type CreatePatientInput,
  type PatientDetail,
} from "@geriatria/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { CheckboxField } from "@/components/ui/checkbox";
import { ErrorAlert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Valores del formulario: todo string/boolean; los selects opcionales usan "".
// La validación/transformación final la hace Zod (mismo esquema que el backend).
interface FormValues {
  firstName: string;
  lastName: string;
  documentId: string;
  birthDate: string;
  sex: "" | (typeof SEX)[number];
  maritalStatus: "" | (typeof MARITAL_STATUS)[number];
  address: string;
  phone: string;
  phoneAlt: string;
  email: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  insuranceProvider: string;
  insuranceNumber: string;
  livesWith: string;
  dependencyLevel: "" | (typeof DEPENDENCY_LEVEL)[number];
  housingSituation: string;
  medicalHistory: string;
  surgicalHistory: string;
  familyHistory: string;
  smoking: "" | (typeof HABIT_STATUS)[number];
  alcohol: "" | (typeof HABIT_STATUS)[number];
  habitsNotes: string;
  notes: string;
  caregivers: {
    name: string;
    relationship: string;
    phone: string;
    livesWith: boolean;
    isPrimary: boolean;
    notes: string;
  }[];
  conditions: { name: string; since: string; active: boolean; notes: string }[];
  allergies: { substance: string; reaction: string; severity: ""; notes: string }[];
}

function emptyValues(): FormValues {
  return {
    firstName: "",
    lastName: "",
    documentId: "",
    birthDate: "",
    sex: "",
    maritalStatus: "",
    address: "",
    phone: "",
    phoneAlt: "",
    email: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    insuranceProvider: "",
    insuranceNumber: "",
    livesWith: "",
    dependencyLevel: "",
    housingSituation: "",
    medicalHistory: "",
    surgicalHistory: "",
    familyHistory: "",
    smoking: "",
    alcohol: "",
    habitsNotes: "",
    notes: "",
    caregivers: [],
    conditions: [],
    allergies: [],
  };
}

// Convierte la ficha existente a valores de formulario (ISO → dd/mm/aaaa, null → "").
function fromDetail(p: PatientDetail): FormValues {
  const s = (v: string | null) => v ?? "";
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    documentId: s(p.documentId),
    birthDate: formatDate(p.birthDate),
    sex: p.sex,
    maritalStatus: p.maritalStatus ?? "",
    address: s(p.address),
    phone: s(p.phone),
    phoneAlt: s(p.phoneAlt),
    email: s(p.email),
    emergencyName: s(p.emergencyName),
    emergencyPhone: s(p.emergencyPhone),
    emergencyRelation: s(p.emergencyRelation),
    insuranceProvider: s(p.insuranceProvider),
    insuranceNumber: s(p.insuranceNumber),
    livesWith: s(p.livesWith),
    dependencyLevel: p.dependencyLevel ?? "",
    housingSituation: s(p.housingSituation),
    medicalHistory: s(p.medicalHistory),
    surgicalHistory: s(p.surgicalHistory),
    familyHistory: s(p.familyHistory),
    smoking: p.smoking ?? "",
    alcohol: p.alcohol ?? "",
    habitsNotes: s(p.habitsNotes),
    notes: s(p.notes),
    caregivers: p.caregivers.map((c) => ({
      name: c.name,
      relationship: c.relationship ?? "",
      phone: c.phone ?? "",
      livesWith: c.livesWith,
      isPrimary: c.isPrimary,
      notes: c.notes ?? "",
    })),
    conditions: p.conditions.map((c) => ({
      name: c.name,
      since: c.since ? formatDate(c.since) : "",
      active: c.active,
      notes: c.notes ?? "",
    })),
    allergies: p.allergies.map((a) => ({
      substance: a.substance,
      reaction: a.reaction ?? "",
      severity: (a.severity ?? "") as "",
      notes: a.notes ?? "",
    })),
  };
}

interface PatientFormProps {
  initial?: PatientDetail;
  submitting?: boolean;
  serverError?: string | null;
  onSubmit: (data: CreatePatientInput) => void;
  onCancel: () => void;
}

export function PatientForm({
  initial,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: PatientFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createPatientSchema) as unknown as Resolver<FormValues>,
    defaultValues: initial ? fromDetail(initial) : emptyValues(),
    mode: "onTouched", // validación al salir del campo (no en cada tecla)
  });

  const caregivers = useFieldArray({ control, name: "caregivers" });
  const conditions = useFieldArray({ control, name: "conditions" });
  const allergies = useFieldArray({ control, name: "allergies" });

  const hasErrors = Object.keys(errors).length > 0;

  // Zod ya transformó los datos al validar; los pasamos tal cual al backend.
  const submit = handleSubmit((data) => onSubmit(data as unknown as CreatePatientInput));

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {serverError && <ErrorAlert message={serverError} />}
      {hasErrors && (
        <ErrorAlert message="Revisá los campos marcados: hay datos faltantes o inválidos." />
      )}

      {/* Datos personales */}
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="firstName" required error={errors.firstName?.message}>
            <Input id="firstName" aria-invalid={!!errors.firstName} {...register("firstName")} />
          </Field>
          <Field label="Apellido" htmlFor="lastName" required error={errors.lastName?.message}>
            <Input id="lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
          </Field>
          <Field label="Documento de identidad" htmlFor="documentId" error={errors.documentId?.message}>
            <Input id="documentId" {...register("documentId")} />
          </Field>
          <Field
            label="Fecha de nacimiento"
            htmlFor="birthDate"
            required
            error={errors.birthDate?.message}
            hint="Formato dd/mm/aaaa"
          >
            <Controller
              control={control}
              name="birthDate"
              render={({ field }) => (
                <DateInput
                  id="birthDate"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!errors.birthDate}
                />
              )}
            />
          </Field>
          <Field label="Sexo" htmlFor="sex" required error={errors.sex?.message}>
            <Select id="sex" aria-invalid={!!errors.sex} {...register("sex")}>
              <option value="">Seleccionar…</option>
              {SEX.map((v) => (
                <option key={v} value={v}>
                  {SEX_LABELS[v]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado civil" htmlFor="maritalStatus" error={errors.maritalStatus?.message}>
            <Select id="maritalStatus" {...register("maritalStatus")}>
              <option value="">Seleccionar…</option>
              {MARITAL_STATUS.map((v) => (
                <option key={v} value={v}>
                  {MARITAL_STATUS_LABELS[v]}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Dirección" htmlFor="address" className="sm:col-span-2" error={errors.address?.message}>
            <Input id="address" {...register("address")} />
          </Field>
          <Field label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...register("phone")} />
          </Field>
          <Field label="Teléfono alternativo" htmlFor="phoneAlt" error={errors.phoneAlt?.message}>
            <Input id="phoneAlt" type="tel" {...register("phoneAlt")} />
          </Field>
          <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </Field>
        </CardContent>
      </Card>

      {/* Contacto de emergencia */}
      <Card>
        <CardHeader>
          <CardTitle>Contacto de emergencia</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Nombre" htmlFor="emergencyName" error={errors.emergencyName?.message}>
            <Input id="emergencyName" {...register("emergencyName")} />
          </Field>
          <Field label="Teléfono" htmlFor="emergencyPhone" error={errors.emergencyPhone?.message}>
            <Input id="emergencyPhone" type="tel" {...register("emergencyPhone")} />
          </Field>
          <Field label="Parentesco" htmlFor="emergencyRelation" error={errors.emergencyRelation?.message}>
            <Input id="emergencyRelation" {...register("emergencyRelation")} />
          </Field>
        </CardContent>
      </Card>

      {/* Seguro / previsión */}
      <Card>
        <CardHeader>
          <CardTitle>Seguro / obra social / previsión</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Prestador" htmlFor="insuranceProvider" error={errors.insuranceProvider?.message}>
            <Input id="insuranceProvider" {...register("insuranceProvider")} />
          </Field>
          <Field label="N.º de afiliado" htmlFor="insuranceNumber" error={errors.insuranceNumber?.message}>
            <Input id="insuranceNumber" {...register("insuranceNumber")} />
          </Field>
        </CardContent>
      </Card>

      {/* Situación social */}
      <Card>
        <CardHeader>
          <CardTitle>Situación social</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="¿Con quién vive?" htmlFor="livesWith" error={errors.livesWith?.message}>
            <Input id="livesWith" {...register("livesWith")} />
          </Field>
          <Field label="Nivel de dependencia" htmlFor="dependencyLevel" error={errors.dependencyLevel?.message}>
            <Select id="dependencyLevel" {...register("dependencyLevel")}>
              <option value="">Seleccionar…</option>
              {DEPENDENCY_LEVEL.map((v) => (
                <option key={v} value={v}>
                  {DEPENDENCY_LEVEL_LABELS[v]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Situación habitacional"
            htmlFor="housingSituation"
            className="sm:col-span-2"
            error={errors.housingSituation?.message}
          >
            <Input id="housingSituation" {...register("housingSituation")} />
          </Field>
        </CardContent>
      </Card>

      {/* Antecedentes */}
      <Card>
        <CardHeader>
          <CardTitle>Antecedentes y hábitos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Antecedentes patológicos" htmlFor="medicalHistory" className="sm:col-span-2">
            <Textarea id="medicalHistory" {...register("medicalHistory")} />
          </Field>
          <Field label="Antecedentes quirúrgicos" htmlFor="surgicalHistory">
            <Textarea id="surgicalHistory" {...register("surgicalHistory")} />
          </Field>
          <Field label="Antecedentes familiares" htmlFor="familyHistory">
            <Textarea id="familyHistory" {...register("familyHistory")} />
          </Field>
          <Field label="Tabaco" htmlFor="smoking">
            <Select id="smoking" {...register("smoking")}>
              <option value="">Seleccionar…</option>
              {HABIT_STATUS.map((v) => (
                <option key={v} value={v}>
                  {HABIT_STATUS_LABELS[v]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Alcohol" htmlFor="alcohol">
            <Select id="alcohol" {...register("alcohol")}>
              <option value="">Seleccionar…</option>
              {HABIT_STATUS.map((v) => (
                <option key={v} value={v}>
                  {HABIT_STATUS_LABELS[v]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notas de hábitos" htmlFor="habitsNotes" className="sm:col-span-2">
            <Input id="habitsNotes" {...register("habitsNotes")} />
          </Field>
        </CardContent>
      </Card>

      {/* Cuidadores / red de apoyo */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Cuidadores y red de apoyo</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              caregivers.append({
                name: "",
                relationship: "",
                phone: "",
                livesWith: false,
                isPrimary: false,
                notes: "",
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Agregar cuidador
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {caregivers.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin cuidadores registrados.</p>
          )}
          {caregivers.fields.map((f, i) => (
            <div key={f.id} className="rounded-md border border-border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre"
                  htmlFor={`cg-name-${i}`}
                  required
                  error={errors.caregivers?.[i]?.name?.message}
                >
                  <Input id={`cg-name-${i}`} {...register(`caregivers.${i}.name`)} />
                </Field>
                <Field label="Parentesco" htmlFor={`cg-rel-${i}`}>
                  <Input id={`cg-rel-${i}`} {...register(`caregivers.${i}.relationship`)} />
                </Field>
                <Field label="Teléfono" htmlFor={`cg-phone-${i}`}>
                  <Input id={`cg-phone-${i}`} type="tel" {...register(`caregivers.${i}.phone`)} />
                </Field>
                <div className="flex flex-wrap items-end gap-4">
                  <CheckboxField
                    id={`cg-lives-${i}`}
                    label="Convive"
                    {...register(`caregivers.${i}.livesWith`)}
                  />
                  <CheckboxField
                    id={`cg-primary-${i}`}
                    label="Principal"
                    {...register(`caregivers.${i}.isPrimary`)}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => caregivers.remove(i)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Condiciones crónicas */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Condiciones crónicas / comorbilidades</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => conditions.append({ name: "", since: "", active: true, notes: "" })}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Agregar condición
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {conditions.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin condiciones registradas.</p>
          )}
          {conditions.fields.map((f, i) => (
            <div key={f.id} className="rounded-md border border-border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Condición"
                  htmlFor={`cond-name-${i}`}
                  required
                  error={errors.conditions?.[i]?.name?.message}
                >
                  <Input id={`cond-name-${i}`} {...register(`conditions.${i}.name`)} />
                </Field>
                <Field
                  label="Desde"
                  htmlFor={`cond-since-${i}`}
                  error={errors.conditions?.[i]?.since?.message}
                  hint="dd/mm/aaaa (opcional)"
                >
                  <Controller
                    control={control}
                    name={`conditions.${i}.since`}
                    render={({ field }) => (
                      <DateInput
                        id={`cond-since-${i}`}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        invalid={!!errors.conditions?.[i]?.since}
                      />
                    )}
                  />
                </Field>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <CheckboxField
                  id={`cond-active-${i}`}
                  label="Activa"
                  {...register(`conditions.${i}.active`)}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => conditions.remove(i)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alergias (siempre resaltadas en rojo) */}
      <Card className="border-destructive/40">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            Alergias
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => allergies.append({ substance: "", reaction: "", severity: "", notes: "" })}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Agregar alergia
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {allergies.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin alergias registradas.</p>
          )}
          {allergies.fields.map((f, i) => (
            <div key={f.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Sustancia / fármaco"
                  htmlFor={`alg-sub-${i}`}
                  required
                  error={errors.allergies?.[i]?.substance?.message}
                >
                  <Input id={`alg-sub-${i}`} {...register(`allergies.${i}.substance`)} />
                </Field>
                <Field label="Reacción" htmlFor={`alg-react-${i}`}>
                  <Input id={`alg-react-${i}`} {...register(`allergies.${i}.reaction`)} />
                </Field>
                <Field label="Severidad" htmlFor={`alg-sev-${i}`}>
                  <Select id={`alg-sev-${i}`} {...register(`allergies.${i}.severity`)}>
                    <option value="">Seleccionar…</option>
                    {ALLERGY_SEVERITY.map((v) => (
                      <option key={v} value={v}>
                        {ALLERGY_SEVERITY_LABELS[v]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Notas" htmlFor={`alg-notes-${i}`}>
                  <Input id={`alg-notes-${i}`} {...register(`allergies.${i}.notes`)} />
                </Field>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => allergies.remove(i)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notas generales */}
      <Card>
        <CardHeader>
          <CardTitle>Notas generales</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" {...register("notes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? "Guardar cambios" : "Crear paciente"}
        </Button>
      </div>
    </form>
  );
}
