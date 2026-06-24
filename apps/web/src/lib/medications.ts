"use client";

/** Hooks de datos para Medicación (TanStack Query). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MedicationItem,
  CreateMedicationInput,
  UpdateMedicationInput,
  SuspendMedicationInput,
} from "@geriatria/schemas";
import { api } from "./api";

export function useMedications(patientId: string) {
  return useQuery({
    queryKey: ["medications", patientId],
    queryFn: () => api.get<{ data: MedicationItem[] }>(`/patients/${patientId}/medications`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, patientId: string) {
  qc.invalidateQueries({ queryKey: ["medications", patientId] });
}

export function useCreateMedication(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMedicationInput) =>
      api.post<{ medication: MedicationItem }>(`/patients/${patientId}/medications`, data),
    onSuccess: () => invalidate(qc, patientId),
  });
}

export function useUpdateMedication(patientId: string, mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMedicationInput) =>
      api.patch<{ medication: MedicationItem }>(`/patients/${patientId}/medications/${mid}`, data),
    onSuccess: () => invalidate(qc, patientId),
  });
}

export function useSuspendMedication(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mid, data }: { mid: string; data: SuspendMedicationInput }) =>
      api.post<{ medication: MedicationItem }>(
        `/patients/${patientId}/medications/${mid}/suspend`,
        data,
      ),
    onSuccess: () => invalidate(qc, patientId),
  });
}

export function useReactivateMedication(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mid: string) =>
      api.post<{ medication: MedicationItem }>(
        `/patients/${patientId}/medications/${mid}/reactivate`,
      ),
    onSuccess: () => invalidate(qc, patientId),
  });
}

export function useDeleteMedication(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mid: string) => api.delete(`/patients/${patientId}/medications/${mid}`),
    onSuccess: () => invalidate(qc, patientId),
  });
}
