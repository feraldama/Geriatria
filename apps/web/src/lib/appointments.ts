"use client";

/** Hooks de datos para Agenda / Citas y dashboard (TanStack Query). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AppointmentItem,
  AppointmentStatus,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@geriatria/schemas";
import { api } from "./api";

interface AppointmentResponse {
  appointment: AppointmentItem;
}
interface RangeResponse {
  data: AppointmentItem[];
}
export interface TodayResponse {
  date: string;
  total: number;
  summary: Record<string, number>;
  appointments: AppointmentItem[];
}

/** Citas en un rango [fromISO, toISO). */
export function useAppointments(fromISO: string, toISO: string) {
  const params = new URLSearchParams({ from: fromISO, to: toISO });
  return useQuery({
    queryKey: ["appointments", { from: fromISO, to: toISO }],
    queryFn: () => api.get<RangeResponse>(`/appointments?${params.toString()}`),
    select: (d) => d.data,
  });
}

export function useTodayAppointments() {
  return useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: () => api.get<TodayResponse>("/dashboard/today"),
  });
}

function invalidateAgenda(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["appointments"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
      api.post<AppointmentResponse>("/appointments", data),
    onSuccess: () => invalidateAgenda(qc),
  });
}

export function useUpdateAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAppointmentInput) =>
      api.patch<AppointmentResponse>(`/appointments/${id}`, data),
    onSuccess: () => invalidateAgenda(qc),
  });
}

/** Cambio rápido de estado (confirmar, atendida, ausente, cancelar). */
export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.patch<AppointmentResponse>(`/appointments/${id}`, { status }),
    onSuccess: () => invalidateAgenda(qc),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/appointments/${id}`),
    onSuccess: () => invalidateAgenda(qc),
  });
}
