"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  carePlanSchema,
  formatDate,
  formatDateTime,
  PERMISSIONS,
  type CarePlanInput,
} from "@geriatria/schemas";
import { useCarePlan, useSaveCarePlan } from "@/lib/extras";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { PatientSubHeader } from "@/components/patient-subheader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scrollToFirstError } from "@/lib/scroll-to-error";

interface FormValues {
  objectives: string;
  indications: string;
  nextControls: string;
  nextControlDate: string;
}

export default function PlanCuidadosPage() {
  const { id } = useParams<{ id: string }>();
  const { data: plan, isLoading, isError } = useCarePlan(id);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);
  const { toast } = useToast();
  const save = useSaveCarePlan(id);
  const [editing, setEditing] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(carePlanSchema) as never,
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: { objectives: "", indications: "", nextControls: "", nextControlDate: "" },
  });

  function startEdit() {
    reset({
      objectives: plan?.objectives ?? "",
      indications: plan?.indications ?? "",
      nextControls: plan?.nextControls ?? "",
      nextControlDate: plan?.nextControlDate ? formatDate(plan.nextControlDate) : "",
    });
    setEditing(true);
  }

  const onSubmit = handleSubmit(async (data) => {
    await save.mutateAsync(data as unknown as CarePlanInput);
    toast("Plan de cuidados guardado");
    setEditing(false);
  }, () => scrollToFirstError());

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando…</p>;

  const empty =
    !plan?.objectives && !plan?.indications && !plan?.nextControls && !plan?.nextControlDate;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Plan de cuidados</h2>
        {canWrite && !editing && (
          <Button variant="outline" onClick={startEdit}>
            {empty ? "Crear plan" : "Editar plan"}
          </Button>
        )}
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">No se pudo cargar el plan.</Card>
      ) : editing ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <Field label="Objetivos" htmlFor="cp-obj">
                <Textarea id="cp-obj" rows={3} {...register("objectives")} />
              </Field>
              <Field label="Indicaciones" htmlFor="cp-ind">
                <Textarea id="cp-ind" rows={4} {...register("indications")} />
              </Field>
              <Field label="Próximos controles" htmlFor="cp-ctrl">
                <Textarea id="cp-ctrl" rows={2} {...register("nextControls")} />
              </Field>
              <Field
                label="Fecha del próximo control"
                htmlFor="cp-date"
                hint="dd/mm/aaaa (genera alerta al acercarse)"
                error={errors.nextControlDate?.message}
              >
                <Controller control={control} name="nextControlDate" render={({ field }) => (
                  <DateInput id="cp-date" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.nextControlDate} />
                )} />
              </Field>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending}>
              Guardar plan
            </Button>
          </div>
        </form>
      ) : empty ? (
        <Card className="p-10 text-center text-muted-foreground">
          Todavía no hay un plan de cuidados.
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plan activo</CardTitle>
            {plan?.updatedAt && (
              <p className="text-sm text-muted-foreground">Actualizado: {formatDateTime(plan.updatedAt)}</p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Section label="Objetivos" value={plan?.objectives} />
            <Section label="Indicaciones" value={plan?.indications} />
            <Section label="Próximos controles" value={plan?.nextControls} />
            {plan?.nextControlDate && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Fecha del próximo control</p>
                <p>{formatDate(plan.nextControlDate)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Section({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
