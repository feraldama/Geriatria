"use client";

/** Hooks de datos para Síndromes geriátricos. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SyndromeAssessmentItem } from "@geriatria/schemas";
import { api } from "./api";

export interface ApplySyndromeInput {
  date: string; // dd/mm/aaaa
  present: string[];
  notes?: string;
}

export function useSyndromes(patientId: string) {
  return useQuery({
    queryKey: ["syndromes", patientId],
    queryFn: () => api.get<{ data: SyndromeAssessmentItem[] }>(`/patients/${patientId}/syndromes`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

export function useSyndrome(patientId: string, sid: string) {
  return useQuery({
    queryKey: ["syndrome", patientId, sid],
    queryFn: () =>
      api.get<{ assessment: SyndromeAssessmentItem }>(`/patients/${patientId}/syndromes/${sid}`),
    select: (d) => d.assessment,
    enabled: !!patientId && !!sid,
  });
}

export function useApplySyndrome(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplySyndromeInput) =>
      api.post<{ assessment: SyndromeAssessmentItem }>(`/patients/${patientId}/syndromes`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["syndromes", patientId] });
      qc.invalidateQueries({ queryKey: ["timeline", patientId] });
    },
  });
}
