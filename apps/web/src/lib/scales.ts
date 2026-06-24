"use client";

/** Hooks de datos para Escalas de valoración geriátrica. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssessmentScaleItem, ScaleAnswers, ScaleType } from "@geriatria/schemas";
import { api } from "./api";

export interface ApplyScaleInput {
  type: ScaleType;
  date: string; // dd/mm/aaaa
  answers: ScaleAnswers;
  notes?: string;
}

export function useScales(patientId: string) {
  return useQuery({
    queryKey: ["scales", patientId],
    queryFn: () => api.get<{ data: AssessmentScaleItem[] }>(`/patients/${patientId}/scales`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

export function useScale(patientId: string, sid: string) {
  return useQuery({
    queryKey: ["scale", patientId, sid],
    queryFn: () => api.get<{ scale: AssessmentScaleItem }>(`/patients/${patientId}/scales/${sid}`),
    select: (d) => d.scale,
    enabled: !!patientId && !!sid,
  });
}

export function useApplyScale(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyScaleInput) =>
      api.post<{ scale: AssessmentScaleItem }>(`/patients/${patientId}/scales`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scales", patientId] });
      qc.invalidateQueries({ queryKey: ["timeline", patientId] });
    },
  });
}
