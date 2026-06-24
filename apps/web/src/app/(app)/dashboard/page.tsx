"use client";

import { CalendarClock } from "lucide-react";
import { formatDate } from "@geriatria/schemas";
import { useCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const hoy = formatDate(new Date()); // dd/mm/aaaa (helper central de fechas)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Hola{user ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground">Hoy es {hoy}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" aria-hidden />
            Agenda de hoy
          </CardTitle>
          <CardDescription>
            Las citas del día aparecerán acá una vez implementada la agenda (Fase 2).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-8 text-center text-muted-foreground">
            Todavía no hay agenda configurada.
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Fase 0 completada: autenticación, control de acceso por roles y andamiaje del sistema.
      </p>
    </div>
  );
}
