"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@geriatria/schemas";
import { useResetUserPassword } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ErrorAlert } from "@/components/ui/alert";
import { scrollToFirstError } from "@/lib/scroll-to-error";

export function ResetPasswordForm({
  userId,
  userName,
  onSuccess,
  onCancel,
}: {
  userId: string;
  userName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const reset = useResetUserPassword(userId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: { newPassword: "" },
  });

  const submit = handleSubmit(async (data) => {
    try {
      await reset.mutateAsync(data);
      toast("Contraseña restablecida");
      onSuccess();
    } catch {
      /* error abajo */
    }
  }, () => scrollToFirstError());

  const serverError =
    reset.error instanceof ApiError ? reset.error.message : reset.error ? "No se pudo restablecer" : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}
      <p className="text-sm text-muted-foreground">
        Definí una nueva contraseña para <span className="font-medium text-foreground">{userName}</span>.
      </p>
      <Field label="Nueva contraseña" htmlFor="rp-pass" required error={errors.newPassword?.message} hint="Mínimo 8 caracteres">
        <Input id="rp-pass" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register("newPassword")} />
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={reset.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={reset.isPending}>
          Restablecer
        </Button>
      </div>
    </form>
  );
}
