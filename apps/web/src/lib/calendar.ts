/**
 * Puente entre las celdas del calendario y la zona horaria de la clínica.
 *
 * Las vistas de agenda construyen sus días con date-fns, que trabaja en la hora
 * del navegador: cada `Date` es solo un marcador de día (año/mes/día), no un
 * instante significativo. Estos helpers traducen ese marcador al día real de la
 * clínica, para que una cita de las 22:00 no aparezca en la columna del día
 * siguiente cuando el navegador está en otro huso.
 */
import { clinicDayKey, clinicWallClockToDate } from "@geriatria/schemas";

/** Clave `aaaa-mm-dd` de una celda del calendario (leída como día local). */
export function calendarDayKey(day: Date): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Instante en que empieza, en la clínica, el día que representa la celda. */
export function calendarDayStart(day: Date): Date {
  return clinicWallClockToDate(day.getFullYear(), day.getMonth() + 1, day.getDate(), 0, 0);
}

/** Instante en que termina (exclusivo) ese mismo día. */
export function calendarDayEnd(day: Date): Date {
  return new Date(calendarDayStart(day).getTime() + 24 * 60 * 60_000);
}

/** ¿La cita cae en el día de la clínica que representa esta celda? */
export function isOnCalendarDay(scheduledAt: string | Date, day: Date): boolean {
  return clinicDayKey(scheduledAt) === calendarDayKey(day);
}
