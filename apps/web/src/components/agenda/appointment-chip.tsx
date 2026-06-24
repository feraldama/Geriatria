"use client";

import { formatTime, type AppointmentItem } from "@geriatria/schemas";
import { cn } from "@/lib/utils";

// Color del borde según estado (significado por color + texto del estado).
const STATUS_BORDER: Record<string, string> = {
  PROGRAMADA: "border-l-muted-foreground",
  CONFIRMADA: "border-l-primary",
  ATENDIDA: "border-l-accent",
  AUSENTE: "border-l-destructive",
  CANCELADA: "border-l-border",
};

/** Chip compacto de cita para las vistas de semana y mes. */
export function AppointmentChip({
  appt,
  onClick,
}: {
  appt: AppointmentItem;
  onClick: () => void;
}) {
  const cancelled = appt.status === "CANCELADA";
  const surname = appt.patientName.split(",")[0];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${formatTime(appt.scheduledAt)} · ${appt.patientName}`}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded border-l-4 bg-muted/60 px-1.5 py-1 text-left text-sm hover:bg-muted focus-visible:outline-none",
        STATUS_BORDER[appt.status],
        cancelled && "text-muted-foreground line-through",
      )}
    >
      <span className="font-medium tabular-nums">{formatTime(appt.scheduledAt)}</span>
      <span className="truncate">{surname}</span>
    </button>
  );
}
