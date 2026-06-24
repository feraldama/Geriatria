"use client";

/** Hooks de datos para Consultas, Signos vitales y Línea de tiempo. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConsultationItem,
  ConsultationInput,
  UpdateConsultationInput,
  VitalSignItem,
  VitalSignInput,
  TimelineEvent,
} from "@geriatria/schemas";
import { api } from "./api";

export function useConsultations(patientId: string) {
  return useQuery({
    queryKey: ["consultations", patientId],
    queryFn: () => api.get<{ data: ConsultationItem[] }>(`/patients/${patientId}/consultations`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

export function useConsultation(patientId: string, cid: string) {
  return useQuery({
    queryKey: ["consultation", patientId, cid],
    queryFn: () =>
      api.get<{ consultation: ConsultationItem }>(`/patients/${patientId}/consultations/${cid}`),
    select: (d) => d.consultation,
    enabled: !!patientId && !!cid,
  });
}

function invalidatePatientClinical(qc: ReturnType<typeof useQueryClient>, patientId: string) {
  qc.invalidateQueries({ queryKey: ["consultations", patientId] });
  qc.invalidateQueries({ queryKey: ["vitals", patientId] });
  qc.invalidateQueries({ queryKey: ["timeline", patientId] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["appointments"] });
}

export function useCreateConsultation(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConsultationInput) =>
      api.post<{ consultation: ConsultationItem }>(`/patients/${patientId}/consultations`, data),
    onSuccess: () => invalidatePatientClinical(qc, patientId),
  });
}

export function useUpdateConsultation(patientId: string, cid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateConsultationInput) =>
      api.patch<{ consultation: ConsultationItem }>(
        `/patients/${patientId}/consultations/${cid}`,
        data,
      ),
    onSuccess: () => {
      invalidatePatientClinical(qc, patientId);
      qc.invalidateQueries({ queryKey: ["consultation", patientId, cid] });
    },
  });
}

export function useVitals(patientId: string) {
  return useQuery({
    queryKey: ["vitals", patientId],
    queryFn: () => api.get<{ data: VitalSignItem[] }>(`/patients/${patientId}/vitals`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

export function useCreateVital(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VitalSignInput) =>
      api.post<{ vital: VitalSignItem }>(`/patients/${patientId}/vitals`, data),
    onSuccess: () => invalidatePatientClinical(qc, patientId),
  });
}

export function useTimeline(patientId: string) {
  return useQuery({
    queryKey: ["timeline", patientId],
    queryFn: () => api.get<{ data: TimelineEvent[] }>(`/patients/${patientId}/timeline`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}
