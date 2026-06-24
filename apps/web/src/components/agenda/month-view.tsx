"use client";

import { isSameDay, isSameMonth, isToday, format } from "date-fns";
import { es } from "date-fns/locale";
import type { AppointmentItem } from "@geriatria/schemas";
import { AppointmentChip } from "./appointment-chip";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  weeks: Date[][]; // semanas (cada una 7 días) que cubren el mes visible
  month: Date; // mes de referencia
  appointments: AppointmentItem[];
  onSelectDay: (d: Date) => void;
  onEdit: (a: AppointmentItem) => void;
}

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export function MonthView({ weeks, month, appointments, onSelectDay, onEdit }: MonthViewProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-1.5 text-sm font-semibold capitalize text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((day) => {
            const inMonth = isSameMonth(day, month);
            const dayAppts = appointments
              .filter((a) => isSameDay(new Date(a.scheduledAt), day))
              .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
            const visible = dayAppts.slice(0, 3);
            const extra = dayAppts.length - visible.length;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-24 border-b border-r border-border p-1",
                  !inMonth && "bg-muted/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums hover:bg-muted focus-visible:outline-none",
                    isToday(day) && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !inMonth && "text-muted-foreground",
                  )}
                  aria-label={`Ver ${format(day, "d 'de' MMMM", { locale: es })}`}
                >
                  {format(day, "d")}
                </button>
                <div className="flex flex-col gap-0.5">
                  {visible.map((a) => (
                    <AppointmentChip key={a.id} appt={a} onClick={() => onEdit(a)} />
                  ))}
                  {extra > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectDay(day)}
                      className="px-1 text-left text-xs text-muted-foreground hover:text-foreground"
                    >
                      +{extra} más
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
