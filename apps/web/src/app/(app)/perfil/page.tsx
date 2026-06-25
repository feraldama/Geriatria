"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput, type UserPreferences } from "@geriatria/schemas";
import { useCurrentUser, useUpdateProfile, useChangePassword } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/alert";
import { scrollToFirstError } from "@/lib/scroll-to-error";

const FONT_SIZES: { value: UserPreferences["fontSize"]; label: string }[] = [
  { value: "sm", label: "Pequeño" },
  { value: "md", label: "Mediano (por defecto)" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Muy grande" },
];

export default function PerfilPage() {
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [fontSize, setFontSize] = useState<UserPreferences["fontSize"]>("md");
  const [initialized, setInitialized] = useState(false);

  // Inicializa el formulario una vez que llega el usuario.
  if (user && !initialized) {
    setName(user.name);
    setPhotoUrl(user.photoUrl ?? "");
    setFontSize(user.preferences.fontSize);
    setInitialized(true);
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    await updateProfile.mutateAsync({
      name: name.trim(),
      photoUrl: photoUrl.trim() || null,
      preferences: { fontSize },
    });
    toast("Perfil actualizado");
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onChangePassword = handleSubmit(async (data) => {
    try {
      await changePassword.mutateAsync(data);
      toast("Contraseña actualizada");
      reset();
    } catch {
      /* error abajo */
    }
  }, () => scrollToFirstError());

  const pwError =
    changePassword.error instanceof ApiError
      ? changePassword.error.message
      : changePassword.error
        ? "No se pudo cambiar la contraseña"
        : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Mi perfil</h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>

      {/* Datos y preferencias */}
      <Card>
        <CardHeader>
          <CardTitle>Datos y preferencias</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveProfile} className="flex flex-col gap-4" noValidate>
            <Field label="Nombre" htmlFor="p-name">
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="URL de foto" htmlFor="p-photo" hint="Opcional">
              <Input id="p-photo" type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
            </Field>
            <Field label="Tamaño de fuente" htmlFor="p-font" hint="Se aplica en toda la interfaz">
              <Select
                id="p-font"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as UserPreferences["fontSize"])}
              >
                {FONT_SIZES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={updateProfile.isPending}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cambio de contraseña */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="flex flex-col gap-4" noValidate>
            {pwError && <ErrorAlert message={pwError} />}
            <Field label="Contraseña actual" htmlFor="cp-current" required error={errors.currentPassword?.message}>
              <Input id="cp-current" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register("currentPassword")} />
            </Field>
            <Field label="Nueva contraseña" htmlFor="cp-new" required error={errors.newPassword?.message} hint="Mínimo 8 caracteres">
              <Input id="cp-new" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register("newPassword")} />
            </Field>
            <Field label="Repetir nueva contraseña" htmlFor="cp-confirm" required error={errors.confirmPassword?.message}>
              <Input id="cp-confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={changePassword.isPending}>
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
