"use client";

/** Hooks de datos para Pacientes (TanStack Query). */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type {
  Paginated,
  PatientDetail,
  PatientListItem,
  CreatePatientInput,
  UpdatePatientInput,
} from "@geriatria/schemas";
import { api } from "./api";

interface PatientResponse {
  patient: PatientDetail;
}

export function usePatients(
  q: string,
  page: number,
  pageSize = 20,
  sort?: { by: string; dir: "asc" | "desc" },
) {
  const params = new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) });
  if (sort) {
    params.set("sortBy", sort.by);
    params.set("sortDir", sort.dir);
  }
  return useQuery({
    queryKey: ["patients", { q, page, pageSize, sort }],
    queryFn: () => api.get<Paginated<PatientListItem>>(`/patients?${params.toString()}`),
    placeholderData: keepPreviousData, // evita parpadeo al paginar/buscar/ordenar
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.get<PatientResponse>(`/patients/${id}`),
    select: (d) => d.patient,
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePatientInput) => api.post<PatientResponse>("/patients", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePatientInput) => api.patch<PatientResponse>(`/patients/${id}`, data),
    onSuccess: (res) => {
      qc.setQueryData(["patient", id], res);
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}
