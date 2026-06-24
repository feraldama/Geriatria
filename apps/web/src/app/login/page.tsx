"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@geriatria/schemas";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { useLogin } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { scrollToFirstError } from "@/lib/scroll-to-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    shouldFocusError: false,
  });

  async function onSubmit(values: LoginInput) {
    try {
      await login.mutateAsync(values);
      router.replace("/dashboard");
    } catch {
      // El error se muestra abajo; reenfocamos el email para reintentar.
      setFocus("email");
    }
  }

  const serverError =
    login.error instanceof ApiError ? login.error.message : login.error ? "No se pudo iniciar sesión" : null;

  return (
    <main
      id="contenido"
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-10"
    >
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="items-center text-center">
          <span className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-6 w-6" aria-hidden />
          </span>
          {/* Título principal de la página = h1 (jerarquía de encabezados). */}
          <h1 className="font-heading text-xl font-semibold leading-tight">
            Sistema de Geriatría
          </h1>
          <CardDescription>Ingresá con tu cuenta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit, () => scrollToFirstError())}
            className="flex flex-col gap-4"
            noValidate
          >
            {serverError && <ErrorAlert message={serverError} />}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-11"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" loading={login.isPending} className="mt-2 w-full">
              Iniciar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
