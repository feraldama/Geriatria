/** Convierte un usuario de Prisma (con rol y permisos) al shape público. */
import type { AuthenticatedUser, UserPreferences } from "@geriatria/schemas";
import { userPreferencesSchema } from "@geriatria/schemas";

// Tipo mínimo que necesitamos del usuario cargado con su rol y permisos.
export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  photoUrl: string | null;
  preferences: unknown;
  role: {
    id: string;
    name: string;
    permissions: { permission: { action: string } }[];
  };
}

export function toAuthenticatedUser(user: UserWithRole): AuthenticatedUser {
  // Las preferencias se validan/normalizan con defaults seguros.
  const prefs: UserPreferences = userPreferencesSchema.parse(user.preferences ?? {});
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    photoUrl: user.photoUrl,
    role: { id: user.role.id, name: user.role.name },
    permissions: user.role.permissions.map((rp) => rp.permission.action),
    preferences: prefs,
  };
}

/** Include de Prisma reutilizable para traer rol + permisos del usuario. */
export const userInclude = {
  role: {
    include: {
      permissions: { include: { permission: true } },
    },
  },
} as const;
