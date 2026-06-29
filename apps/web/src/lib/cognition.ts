"use client";

/** Hooks de datos para la evaluación de lenguaje/cognición con láminas. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CognitionAssessmentItem } from "@geriatria/schemas";
import { api } from "./api";

export interface ApplyLanguageInput {
  date: string; // dd/mm/aaaa
  naming: boolean[];
  phrases: boolean[];
  descriptionNotes?: string;
  notes?: string;
}

export function useLanguageAssessments(patientId: string) {
  return useQuery({
    queryKey: ["language", patientId],
    queryFn: () => api.get<{ data: CognitionAssessmentItem[] }>(`/patients/${patientId}/language`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

export function useLanguageAssessment(patientId: string, lid: string) {
  return useQuery({
    queryKey: ["language-item", patientId, lid],
    queryFn: () =>
      api.get<{ assessment: CognitionAssessmentItem }>(`/patients/${patientId}/language/${lid}`),
    select: (d) => d.assessment,
    enabled: !!patientId && !!lid,
  });
}

export function useApplyLanguage(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyLanguageInput) =>
      api.post<{ assessment: CognitionAssessmentItem }>(`/patients/${patientId}/language`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["language", patientId] });
      qc.invalidateQueries({ queryKey: ["timeline", patientId] });
    },
  });
}
