"use client";

import Link from "next/link";
import { BellRing, Syringe, CalendarClock, TrendingDown } from "lucide-react";
import { formatDate, type AlertItem, type AlertKind } from "@geriatria/schemas";
import { useAlerts } from "@/lib/extras";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ICONS: Record<AlertKind, typeof Syringe> = {
  vaccine: Syringe,
  control: CalendarClock,
  scale: TrendingDown,
};

// Cada alerta enlaza a la sección relevante del paciente.
function hrefFor(a: AlertItem): string {
  const base = `/pacientes/${a.patientId}`;
  if (a.kind === "vaccine") return `${base}/vacunacion`;
  if (a.kind === "control") return `${base}/plan-cuidados`;
  return `${base}/escalas`;
}

export function AlertsCard() {
  const { data: alerts, isLoading } = useAlerts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" aria-hidden />
          Alertas
          {alerts && alerts.length > 0 && (
            <span className="text-base font-normal text-muted-foreground">({alerts.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-4 text-center text-muted-foreground">Cargando…</p>
        ) : !alerts || alerts.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-6 text-center text-muted-foreground">
            Sin alertas pendientes.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {alerts.map((a, i) => {
              const Icon = ICONS[a.kind];
              return (
                <li key={i}>
                  <Link
                    href={hrefFor(a)}
                    className="flex items-center gap-3 py-2.5 hover:text-primary"
                  >
                    <Icon
                      className={cn("h-5 w-5 shrink-0", a.severity === "bad" ? "text-destructive" : "text-amber-600")}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.patientName}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.message}</p>
                    </div>
                    {a.date && (
                      <Badge variant={a.severity === "bad" ? "destructive" : "warning"}>
                        {formatDate(a.date)}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
