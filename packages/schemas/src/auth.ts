/**
 * Esquemas Zod compartidos para autenticación y perfil de usuario.
 * Se usan tanto en el backend (validación en el borde de cada endpoint)
 * como en el frontend (validación de formularios) para no duplicar reglas.
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Requisitos mínimos de contraseña. Se mantienen razonables; el operador puede
// endurecerlos a futuro sin cambiar la forma del esquema.
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(100, "La contraseña es demasiado larga");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Preferencias de interfaz del usuario (incluye tamaño de fuente; extensible).
export const userPreferencesSchema = z.object({
  fontSize: z.enum(["sm", "md", "lg", "xl"]).default("md"),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(120).optional(),
  photoUrl: z.string().url("URL de foto inválida").nullish(),
  preferences: userPreferencesSchema.partial().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Forma del usuario autenticado que devuelve el backend (sin datos sensibles). */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  photoUrl: string | null;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
  preferences: UserPreferences;
}
