import type { AppointmentStatus } from "@geriatria/schemas";

// Variante de Badge para cada estado de cita (color con significado).
export const STATUS_BADGE_VARIANT: Record<
  AppointmentStatus,
  "default" | "primary" | "accent" | "destructive" | "outline"
> = {
  PROGRAMADA: "default",
  CONFIRMADA: "primary",
  ATENDIDA: "accent",
  AUSENTE: "destructive",
  CANCELADA: "outline",
};
