"use client";

/** Hooks de datos para Consultas, Signos vitales y Línea de tiempo. */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type {
  ConsultationItem,
  ConsultationInput,
  UpdateConsultationInput,
  VitalSignItem,
  VitalSignInput,
  TimelineEvent,
} from "@geriatria/schemas";
import { api } from "./api";

/** Todas las consultas (hasta el techo del backend). La usa el resumen imprimible. */
export function useConsultations(patientId: string) {
  return useQuery({
    queryKey: ["consultations", patientId],
    queryFn: () => api.get<{ data: ConsultationItem[] }>(`/patients/${patientId}/consultations`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

/** Listado paginado de consultas. Página y orden los resuelve el backend. */
export function useConsultationsPaged(patientId: string, page: number, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return useQuery({
    queryKey: ["consultations", patientId, page, pageSize],
    queryFn: () =>
      api.get<{ data: ConsultationItem[]; total: number }>(
        `/patients/${patientId}/consultations?${params.toString()}`,
      ),
    placeholderData: keepPreviousData, // evita parpadeo al paginar
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
      // El formulario/llamador ya muestra el error; sin esto se vería dos veces.
      meta: { errorHandledByCaller: true },
    mutationFn: (data: ConsultationInput) =>
      api.post<{ consultation: ConsultationItem }>(`/patients/${patientId}/consultations`, data),
    onSuccess: () => invalidatePatientClinical(qc, patientId),
  });
}

export function useUpdateConsultation(patientId: string, cid: string) {
  const qc = useQueryClient();
  return useMutation({
      // El formulario/llamador ya muestra el error; sin esto se vería dos veces.
      meta: { errorHandledByCaller: true },
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

/** Signos vitales paginados. Búsqueda de página y ordenamiento en el backend. */
export function useVitals(
  patientId: string,
  sort: { by: string; dir: "asc" | "desc" },
  page: number,
  pageSize = 20,
) {
  const params = new URLSearchParams({
    sortBy: sort.by,
    sortDir: sort.dir,
    page: String(page),
    pageSize: String(pageSize),
  });
  return useQuery({
    queryKey: ["vitals", patientId, sort, page, pageSize],
    queryFn: () =>
      api.get<{ data: VitalSignItem[]; total: number }>(
        `/patients/${patientId}/vitals?${params.toString()}`,
      ),
    placeholderData: keepPreviousData, // evita parpadeo al paginar/ordenar
    enabled: !!patientId,
  });
}

export function useCreateVital(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
      // El formulario/llamador ya muestra el error; sin esto se vería dos veces.
      meta: { errorHandledByCaller: true },
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
