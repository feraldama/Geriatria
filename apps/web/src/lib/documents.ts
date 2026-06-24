"use client";

/** Hooks de datos para Documentos (TanStack Query). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocumentItem } from "@geriatria/schemas";
import { api, ApiError } from "./api";

export function useDocuments(patientId: string) {
  return useQuery({
    queryKey: ["documents", patientId],
    queryFn: () => api.get<{ data: DocumentItem[] }>(`/patients/${patientId}/documents`),
    select: (d) => d.data,
    enabled: !!patientId,
  });
}

/**
 * Subida de archivo (multipart). No usamos el cliente JSON: enviamos FormData
 * para que el navegador ponga el boundary correcto. La cookie viaja por ser
 * mismo origen (proxy de Next).
 */
async function uploadDocument(patientId: string, formData: FormData): Promise<DocumentItem> {
  const res = await fetch(`/api/v1/patients/${patientId}/documents`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.message ?? "Error al subir", err.code, err.details);
  }
  return (body as { document: DocumentItem }).document;
}

export function useUploadDocument(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => uploadDocument(patientId, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", patientId] }),
  });
}

export function useDeleteDocument(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.delete(`/patients/${patientId}/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", patientId] }),
  });
}

/** URL del archivo (a través del proxy) para previsualizar o descargar. */
export function documentFileUrl(patientId: string, docId: string): string {
  return `/api/v1/patients/${patientId}/documents/${docId}/file`;
}
