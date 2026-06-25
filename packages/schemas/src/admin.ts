/**
 * Esquemas y tipos para administración: usuarios, roles, permisos y auditoría
 * (Fase 7). El backend valida los permisos (user:manage / role:manage /
 * audit:read) en cada endpoint.
 */
import { z } from "zod";
import { passwordSchema } from "./auth";

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  password: passwordSchema,
  roleId: z.string().min(1, "Seleccioná un rol"),
  active: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido").optional(),
  roleId: z.string().min(1).optional(),
  active: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role: { id: string; name: string };
  lastLoginAt: string | null; // ISO
}

// ─── Roles y permisos ────────────────────────────────────────────────────────

export const roleSchema = z.object({
  name: z.string().trim().min(1, "El nombre del rol es obligatorio").max(80),
  description: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  // Lista de acciones de permiso (ej. "patient:read") asignadas al rol.
  permissions: z.array(z.string()).default([]),
});
export type RoleInput = z.infer<typeof roleSchema>;

export const updateRoleSchema = roleSchema.partial();
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[]; // acciones
  userCount: number;
}

export interface PermissionItem {
  action: string;
  description: string;
}

// ─── Auditoría ────────────────────────────────────────────────────────────────

export interface AuditLogItem {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  user: { id: string; name: string; email: string } | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO
}
