"use client";

/** Hooks de autenticación basados en TanStack Query. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthenticatedUser, LoginInput } from "@geriatria/schemas";
import { api, ApiError } from "./api";

interface MeResponse {
  user: AuthenticatedUser;
}

/** Devuelve el usuario autenticado (o null si no hay sesión). */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const data = await api.get<MeResponse>("/auth/me");
        return data.user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<MeResponse>("/auth/login", input),
    onSuccess: (data) => qc.setQueryData(["me"], data.user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => qc.setQueryData(["me"], null),
  });
}

/** Comprueba si el usuario tiene un permiso (RBAC en el frontend, solo UI). */
export function hasPermission(user: AuthenticatedUser | null | undefined, action: string) {
  return !!user?.permissions.includes(action);
}
