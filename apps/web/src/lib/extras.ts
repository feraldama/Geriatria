"use client";

/** Hooks para Vacunación, Plan de cuidados y Alertas (Fase 8). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  VaccinationItem,
  VaccinationInput,
  UpdateVaccinationInput,
  CarePlanItem,
  CarePlanInput,
  AlertItem,
} from "@geriatria/schemas";
import { api } from "./api";

// ─── Vacunación ───────────────────────────────────────────────────────────────

export function useVaccinations(patientId: string) {
  return useQuery({
    queryKey: ["vaccinations", patientId],
    queryFn: () => api.get<{ data: VaccinationItem[] }>(`/patients/${patientId}/vaccinations`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, patientId: string) {
  qc.invalidateQueries({ queryKey: ["vaccinations", patientId] });
  qc.invalidateQueries({ queryKey: ["alerts"] });
}

export function useCreateVaccination(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VaccinationInput) =>
      api.post<{ vaccination: VaccinationItem }>(`/patients/${patientId}/vaccinations`, data),
    onSuccess: () => invalidate(qc, patientId),
  });
}

export function useUpdateVaccination(patientId: string, vid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateVaccinationInput) =>
      api.patch<{ vaccination: VaccinationItem }>(`/patients/${patientId}/vaccinations/${vid}`, data),
    onSuccess: () => invalidate(qc, patientId),
  });
}

export function useDeleteVaccination(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vid: string) => api.delete(`/patients/${patientId}/vaccinations/${vid}`),
    onSuccess: () => invalidate(qc, patientId),
  });
}

// ─── Plan de cuidados ─────────────────────────────────────────────────────────

export function useCarePlan(patientId: string) {
  return useQuery({
    queryKey: ["carePlan", patientId],
    queryFn: () => api.get<{ carePlan: CarePlanItem }>(`/patients/${patientId}/care-plan`),
    select: (d) => d.carePlan,
    enabled: !!patientId,
  });
}

export function useSaveCarePlan(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CarePlanInput) =>
      api.put<{ carePlan: CarePlanItem }>(`/patients/${patientId}/care-plan`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carePlan", patientId] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

// ─── Alertas ────────────────────────────────────────────────────────────────

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.get<{ data: AlertItem[] }>("/dashboard/alerts"),
    select: (d) => d.data,
  });
}
