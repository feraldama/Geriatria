"use client";

import Link from "next/link";
import { isSameDay } from "date-fns";
import {
  formatTime,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentItem,
  type AppointmentStatus,
} from "@geriatria/schemas";
import { STATUS_BADGE_VARIANT } from "@/lib/appointment-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DayViewProps {
  date: Date;
  appointments: AppointmentItem[];
  canWrite: boolean;
  canClinical: boolean;
  onEdit: (a: AppointmentItem) => void;
  onStatus: (a: AppointmentItem, status: AppointmentStatus) => void;
  onRegisterConsultation: (a: AppointmentItem) => void;
}

export function DayView({
  date,
  appointments,
  canWrite,
  canClinical,
  onEdit,
  onStatus,
  onRegisterConsultation,
}: DayViewProps) {
  const items = appointments
    .filter((a) => isSameDay(new Date(a.scheduledAt), date))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  if (items.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        No hay citas para este día.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((a) => {
        const cancelled = a.status === "CANCELADA";
        return (
          <Card key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
            <div className="w-16 shrink-0">
              <p className="font-heading text-lg font-semibold tabular-nums">
                {formatTime(a.scheduledAt)}
              </p>
              <p className="text-sm text-muted-foreground">{a.durationMin} min</p>
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/pacientes/${a.patientId}`}
                className={cn("font-medium hover:text-primary", cancelled && "line-through")}
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
            {canWrite && !cancelled && (
              <div className="flex flex-wrap gap-2">
                {a.status === "PROGRAMADA" && (
                  <Button variant="outline" size="sm" onClick={() => onStatus(a, "CONFIRMADA")}>
                    Confirmar
                  </Button>
                )}
                {a.status !== "ATENDIDA" && (
                  <Button variant="outline" size="sm" onClick={() => onStatus(a, "ATENDIDA")}>
                    Atendida
                  </Button>
                )}
                {a.status !== "AUSENTE" && (
                  <Button variant="outline" size="sm" onClick={() => onStatus(a, "AUSENTE")}>
                    Ausente
                  </Button>
                )}
                {canClinical && (
                  <Button variant="default" size="sm" onClick={() => onRegisterConsultation(a)}>
                    Registrar consulta
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onEdit(a)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onStatus(a, "CANCELADA")}>
                  Cancelar
                </Button>
              </div>
            )}
            {canWrite && cancelled && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(a)}>
                Editar
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
