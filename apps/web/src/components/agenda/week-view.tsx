"use client";

import { isSameDay, isToday, format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus } from "lucide-react";
import type { AppointmentItem } from "@geriatria/schemas";
import { AppointmentChip } from "./appointment-chip";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  days: Date[];
  appointments: AppointmentItem[];
  canWrite: boolean;
  onEdit: (a: AppointmentItem) => void;
  onNewOnDay: (d: Date) => void;
}

export function WeekView({ days, appointments, canWrite, onEdit, onNewOnDay }: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((day) => {
        const dayAppts = appointments
          .filter((a) => isSameDay(new Date(a.scheduledAt), day))
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        return (
          <div key={day.toISOString()} className="flex flex-col rounded-md border border-border">
            <div
              className={cn(
                "flex items-center justify-between border-b border-border px-2 py-1.5",
                isToday(day) && "bg-primary/10",
              )}
            >
              <span className="text-sm font-medium capitalize">
                {format(day, "EEE d", { locale: es })}
              </span>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => onNewOnDay(day)}
                  aria-label={`Nueva cita el ${format(day, "d 'de' MMMM", { locale: es })}`}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            <div className="flex min-h-16 flex-col gap-1 p-1.5">
              {dayAppts.length === 0 ? (
                <span className="px-1 text-xs text-muted-foreground">—</span>
              ) : (
                dayAppts.map((a) => (
                  <AppointmentChip key={a.id} appt={a} onClick={() => onEdit(a)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
