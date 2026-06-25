"use client";

/** Hooks de datos para administración: usuarios, roles, permisos y auditoría. */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type {
  Paginated,
  UserListItem,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
  RoleItem,
  RoleInput,
  UpdateRoleInput,
  PermissionItem,
  AuditLogItem,
} from "@geriatria/schemas";
import { api } from "./api";

// ─── Usuarios ────────────────────────────────────────────────────────────────

export function useUsers(q: string, page: number, sort?: { by: string; dir: "asc" | "desc" }) {
  const params = new URLSearchParams({ q, page: String(page), pageSize: "20" });
  if (sort) {
    params.set("sortBy", sort.by);
    params.set("sortDir", sort.dir);
  }
  return useQuery({
    queryKey: ["users", { q, page, sort }],
    queryFn: () => api.get<Paginated<UserListItem>>(`/users?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}

function invalidateUsers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["users"] });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => api.post<{ user: UserListItem }>("/users", data),
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInput) => api.patch<{ user: UserListItem }>(`/users/${id}`, data),
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useResetUserPassword(id: string) {
  return useMutation({
    mutationFn: (data: ResetPasswordInput) => api.post(`/users/${id}/reset-password`, data),
  });
}

// ─── Roles y permisos ────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<{ data: RoleItem[] }>("/roles"),
    select: (d) => d.data,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => api.get<{ data: PermissionItem[] }>("/permissions"),
    select: (d) => d.data,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RoleInput) => api.post<{ role: RoleItem }>("/roles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUpdateRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRoleInput) => api.patch<{ role: RoleItem }>(`/roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

// ─── Auditoría ────────────────────────────────────────────────────────────────

export function useAuditLog(action: string, page: number, sort?: { by: string; dir: "asc" | "desc" }) {
  const params = new URLSearchParams({ action, page: String(page), pageSize: "30" });
  if (sort) {
    params.set("sortBy", sort.by);
    params.set("sortDir", sort.dir);
  }
  return useQuery({
    queryKey: ["audit", { action, page, sort }],
    queryFn: () => api.get<Paginated<AuditLogItem>>(`/audit?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}
