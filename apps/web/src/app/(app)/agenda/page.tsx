"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  eachDayOfInterval,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import {
  formatDate,
  PERMISSIONS,
  type AppointmentItem,
  type AppointmentStatus,
} from "@geriatria/schemas";
import {
  useAppointments,
  useUpdateAppointmentStatus,
} from "@/lib/appointments";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/appointment-form";
import { DayView } from "@/components/agenda/day-view";
import { WeekView } from "@/components/agenda/week-view";
import { MonthView } from "@/components/agenda/month-view";
import { cn } from "@/lib/utils";

type View = "dia" | "semana" | "mes";

const WEEK_OPTS = { weekStartsOn: 1 } as const; // semana inicia el lunes

export default function AgendaPage() {
  const router = useRouter();
  // Estado inicial desde la URL (?view=&date=YYYY-MM-DD), p. ej. al venir desde
  // la línea de tiempo. Se lee una sola vez al montar (solo en el cliente).
  const [view, setView] = useState<View>(() => {
    const v = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("view") : null;
    return v === "dia" || v === "semana" || v === "mes" ? v : "semana";
  });
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("date") : null;
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y!, m! - 1, day!);
    }
    return new Date();
  });
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.APPOINTMENT_WRITE);
  const canClinical = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);
  const { toast } = useToast();
  const statusMutation = useUpdateAppointmentStatus();

  // Estado del modal de cita.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentItem | undefined>();
  const [presetDate, setPresetDate] = useState<string | undefined>();

  // Rango [from, to) a consultar según la vista.
  const { from, to, days, weeks } = useMemo(() => {
    if (view === "dia") {
      return { from: startOfDay(anchor), to: endOfDay(anchor), days: [anchor], weeks: [] };
    }
    if (view === "semana") {
      const start = startOfWeek(anchor, WEEK_OPTS);
      const end = endOfWeek(anchor, WEEK_OPTS);
      return {
        from: startOfDay(start),
        to: endOfDay(end),
        days: eachDayOfInterval({ start, end }),
        weeks: [],
      };
    }
    // mes
    const gridStart = startOfWeek(startOfMonth(anchor), WEEK_OPTS);
    const gridEnd = endOfWeek(endOfMonth(anchor), WEEK_OPTS);
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const wks: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) wks.push(allDays.slice(i, i + 7));
    return { from: startOfDay(gridStart), to: endOfDay(gridEnd), days: [], weeks: wks };
  }, [view, anchor]);

  const { data: appointments = [], isLoading } = useAppointments(
    from.toISOString(),
    to.toISOString(),
  );

  function navigate(dir: -1 | 1) {
    setAnchor((d) =>
      view === "dia" ? addDays(d, dir) : view === "semana" ? addWeeks(d, dir) : addMonths(d, dir),
    );
  }

  function openNew(date?: Date) {
    setEditing(undefined);
    setPresetDate(date ? formatDate(date) : formatDate(anchor));
    setFormOpen(true);
  }
  function openEdit(a: AppointmentItem) {
    setEditing(a);
    setPresetDate(undefined);
    setFormOpen(true);
  }
  async function onStatus(a: AppointmentItem, status: AppointmentStatus) {
    await statusMutation.mutateAsync({ id: a.id, status });
    toast("Estado actualizado");
  }

  const periodLabel =
    view === "dia"
      ? format(anchor, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
      : view === "semana"
        ? `${format(startOfWeek(anchor, WEEK_OPTS), "d MMM", { locale: es })} – ${format(
            endOfWeek(anchor, WEEK_OPTS),
            "d MMM yyyy",
            { locale: es },
          )}`
        : format(anchor, "MMMM 'de' yyyy", { locale: es });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Agenda</h1>
        {canWrite && (
          <Button onClick={() => openNew()}>
            <Plus className="h-5 w-5" aria-hidden />
            Nueva cita
          </Button>
        )}
      </div>

      {/* Controles: navegación + período + selector de vista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)} aria-label="Siguiente">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <span className="ml-2 flex items-center gap-2 font-medium capitalize">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
            {periodLabel}
          </span>
        </div>

        <div
          role="group"
          aria-label="Vista del calendario"
          className="flex rounded-md border border-border p-0.5"
        >
          {(["dia", "semana", "mes"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "min-h-9 rounded px-3 text-sm font-medium capitalize transition-colors focus-visible:outline-none",
                view === v ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              )}
            >
              {v === "dia" ? "Día" : v}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : view === "dia" ? (
        <DayView
          date={anchor}
          appointments={appointments}
          canWrite={canWrite}
          canClinical={canClinical}
          onEdit={openEdit}
          onStatus={onStatus}
          onRegisterConsultation={(a) =>
            router.push(`/pacientes/${a.patientId}/consultas/nueva?appointmentId=${a.id}`)
          }
        />
      ) : view === "semana" ? (
        <WeekView
          days={days}
          appointments={appointments}
          canWrite={canWrite}
          onEdit={openEdit}
          onNewOnDay={openNew}
        />
      ) : (
        <MonthView
          weeks={weeks}
          month={anchor}
          appointments={appointments}
          onSelectDay={(d) => {
            setAnchor(d);
            setView("dia");
          }}
          onEdit={openEdit}
        />
      )}

      <Dialog
        open={formOpen}
        title={editing ? "Editar cita" : "Nueva cita"}
        onClose={() => setFormOpen(false)}
        closeOnBackdrop={false}
      >
        <AppointmentForm
          initial={editing}
          defaultDate={presetDate}
          onSuccess={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>
    </div>
  );
}
