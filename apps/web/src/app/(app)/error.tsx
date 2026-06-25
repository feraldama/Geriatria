"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Límite de error para el área autenticada (App Router). */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción esto iría a un servicio de logs del operador.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-heading text-xl font-semibold">Algo salió mal</h1>
          <p className="text-muted-foreground">
            Ocurrió un error inesperado. Podés reintentar o volver al inicio.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => reset()}>Reintentar</Button>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
              Ir al inicio
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
