"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserListItem,
} from "@geriatria/schemas";
import { useCreateUser, useUpdateUser, useRoles } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox";
import { ErrorAlert } from "@/components/ui/alert";
import { scrollToFirstError } from "@/lib/scroll-to-error";

interface FormValues {
  name: string;
  email: string;
  password: string;
  roleId: string;
  active: boolean;
}

export function UserForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: UserListItem;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const { data: roles } = useRoles();
  const create = useCreateUser();
  const update = useUpdateUser(initial?.id ?? "");
  const mutation = isEdit ? update : create;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: initial
      ? { name: initial.name, email: initial.email, password: "", roleId: initial.role.id, active: initial.active }
      : { name: "", email: "", password: "", roleId: "", active: true },
  });

  const submit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        const { name, email, roleId, active } = data;
        await update.mutateAsync({ name, email, roleId, active } as UpdateUserInput);
        toast("Usuario actualizado");
      } else {
        await create.mutateAsync(data as unknown as CreateUserInput);
        toast("Usuario creado");
      }
      onSuccess();
    } catch {
      /* error abajo */
    }
  }, () => scrollToFirstError());

  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "No se pudo guardar el usuario"
        : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}

      <Field label="Nombre" htmlFor="u-name" required error={errors.name?.message}>
        <Input id="u-name" aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field label="Correo electrónico" htmlFor="u-email" required error={errors.email?.message}>
        <Input id="u-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      {!isEdit && (
        <Field
          label="Contraseña"
          htmlFor="u-password"
          required
          error={errors.password?.message}
          hint="Mínimo 8 caracteres"
        >
          <Input id="u-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
      )}
      <Field label="Rol" htmlFor="u-role" required error={errors.roleId?.message}>
        <Select id="u-role" aria-invalid={!!errors.roleId} {...register("roleId")}>
          <option value="">Seleccionar…</option>
          {roles?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <CheckboxField id="u-active" label="Usuario activo" {...register("active")} />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
