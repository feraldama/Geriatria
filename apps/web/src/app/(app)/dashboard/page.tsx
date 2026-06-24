"use client";

import Link from "next/link";
import { CalendarClock, ArrowRight } from "lucide-react";
import {
  formatDate,
  formatTime,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@geriatria/schemas";
import { useCurrentUser } from "@/lib/auth";
import { useTodayAppointments } from "@/lib/appointments";
import { STATUS_BADGE_VARIANT } from "@/lib/appointment-ui";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useTodayAppointments();
  const hoy = formatDate(new Date()); // dd/mm/aaaa (helper central de fechas)
  const appointments = data?.appointments ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Hola{user ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground">Hoy es {hoy}</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" aria-hidden />
            Agenda de hoy
            {data && data.total > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                ({data.total} {data.total === 1 ? "cita" : "citas"})
              </span>
            )}
          </CardTitle>
          <Link
            href="/agenda"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ver agenda
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-muted-foreground">Cargando…</p>
          ) : appointments.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-8 text-center text-muted-foreground">
              No hay citas programadas para hoy.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {appointments.map((a) => {
                const cancelled = a.status === "CANCELADA";
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className="w-14 shrink-0 font-heading text-lg font-semibold tabular-nums">
                      {formatTime(a.scheduledAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/pacientes/${a.patientId}`}
                        className={cn(
                          "font-medium hover:text-primary",
                          cancelled && "line-through",
                        )}
                      >
                        {a.patientName}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {APPOINTMENT_TYPE_LABELS[a.type]}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[a.status]}>
                      {APPOINTMENT_STATUS_LABELS[a.status]}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
