/**
 * Catálogo de permisos del sistema (modelo `recurso:acción`).
 *
 * Esta es la fuente de verdad del CÓDIGO para los permisos disponibles. El
 * backend siembra (seed) estos permisos en la base de datos y allí los roles
 * los agrupan. Definir más roles a futuro no requiere tocar código; agregar
 * nuevos permisos sí pasa por acá para mantener tipado y autocompletado.
 */

export const PERMISSIONS = {
  // Pacientes
  PATIENT_READ: "patient:read",
  PATIENT_WRITE: "patient:write",
  PATIENT_DELETE: "patient:delete",
  // Agenda / citas
  APPOINTMENT_READ: "appointment:read",
  APPOINTMENT_WRITE: "appointment:write",
  // Historia clínica (consultas, escalas, medicación, documentos, vitales)
  CLINICAL_READ: "clinical:read",
  CLINICAL_WRITE: "clinical:write",
  // Gestión de usuarios y roles
  USER_MANAGE: "user:manage",
  ROLE_MANAGE: "role:manage",
  // Auditoría
  AUDIT_READ: "audit:read",
} as const;

export type PermissionAction = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Lista plana de todas las acciones de permiso (para seed y validaciones). */
export const ALL_PERMISSIONS: PermissionAction[] = Object.values(PERMISSIONS);

/** Metadatos legibles de cada permiso (descripción en español para la UI). */
export const PERMISSION_DESCRIPTIONS: Record<PermissionAction, string> = {
  "patient:read": "Ver pacientes",
  "patient:write": "Crear y editar pacientes",
  "patient:delete": "Desactivar pacientes (borrado lógico)",
  "appointment:read": "Ver la agenda y las citas",
  "appointment:write": "Crear, editar y cancelar citas",
  "clinical:read": "Ver la historia clínica (consultas, escalas, medicación, documentos)",
  "clinical:write": "Registrar y editar información clínica",
  "user:manage": "Gestionar usuarios",
  "role:manage": "Gestionar roles y permisos",
  "audit:read": "Ver el registro de auditoría",
};

/** Nombres de los roles base sembrados al inicializar el sistema. */
export const BASE_ROLES = {
  ADMIN: "Administrador",
  DOCTOR: "Médico/a",
  RECEPTION: "Recepción",
  READONLY: "Solo lectura",
} as const;

export type BaseRoleName = (typeof BASE_ROLES)[keyof typeof BASE_ROLES];

/** Permisos asignados a cada rol base en el seed inicial. */
export const BASE_ROLE_PERMISSIONS: Record<BaseRoleName, PermissionAction[]> = {
  [BASE_ROLES.ADMIN]: ALL_PERMISSIONS,
  [BASE_ROLES.DOCTOR]: [
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_WRITE,
    PERMISSIONS.CLINICAL_READ,
    PERMISSIONS.CLINICAL_WRITE,
  ],
  // Recepción: agenda y datos administrativos, SIN acceso a la historia clínica.
  [BASE_ROLES.RECEPTION]: [
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_WRITE,
  ],
  // Solo lectura: consulta sin editar (auditoría/suplencias).
  [BASE_ROLES.READONLY]: [
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.CLINICAL_READ,
  ],
};
