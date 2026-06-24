# Prompt / Especificación: Sistema de Gestión Clínica para Geriatría

> **Cómo usar este documento:** Pégalo en Claude Code (recomendado) o Cowork como instrucción inicial.
> Pídele que construya el sistema **por fases** (empezando por el MVP). No le pidas todo de una sola
> vez: irás validando cada fase antes de avanzar.

---

## 0. Contexto y rol

Eres un ingeniero de software senior. Vas a construir, por fases, un **sistema de gestión clínica
para una médica especialista en geriatría** que atiende pacientes adultos mayores de forma
longitudinal (durante años). El sistema debe centralizar fichas, agenda, historial de consultas,
medicación, escalas geriátricas y documentos de estudios.

Trabaja de forma incremental: al terminar cada fase, deténte, muestra cómo correr lo hecho y espera
confirmación antes de continuar.

---

## 1. Stack tecnológico (obligatorio)

- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend (API):** Node.js + Express + TypeScript (servicio separado del frontend)
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **Validación:** Zod (compartida entre frontend y backend mediante un paquete común)
- **Autenticación:** JWT con cookies httpOnly + bcrypt para contraseñas
- **Manejo de fechas:** date-fns
- **Estado/datos en frontend:** TanStack Query (React Query)
- **Componentes UI:** shadcn/ui sobre Tailwind
- **Tests:** Vitest + Supertest (API) y Playwright para flujos críticos

### Estructura del repositorio (monorepo)

```
/sistema-geriatria
  /apps
    /web        → Next.js (frontend)
    /api        → Express + Prisma (backend)
  /packages
    /schemas    → esquemas Zod y tipos compartidos
    /config     → eslint, tsconfig base
  docker-compose.yml   → Postgres + (opcional) adminer
  README.md
```

Usa **pnpm workspaces** o **Turborepo** para gestionar el monorepo.

---

## 2. Parámetros ya definidos

Estos puntos están decididos y son obligatorios:

1. **Usuarios y roles.** Hoy lo usa solo la doctora, pero el sistema **debe permitir crear usuarios,
   roles y perfiles** desde el inicio (ver sección 3.10). La arquitectura se construye con control de
   acceso por roles (RBAC) desde la Fase 0; no es un añadido posterior.
2. **Despliegue.** El sistema **se va a usar desde un servidor accesible desde afuera** (acceso
   remoto por internet). La infraestructura del servidor —Postgres, TLS/HTTPS y respaldos— la
   configura y administra **el operador del sistema**, no la aplicación. El código no debe asumir ni
   imponer esa configuración; debe ser compatible con ella (ver sección 4).
3. **Formato de fecha.** Todas las fechas que vea el usuario se muestran y se ingresan en formato
   **`dd/mm/aaaa`** (y `dd/mm/aaaa HH:mm` cuando lleve hora). Internamente se guardan en UTC/ISO en
   Postgres; el formato `dd/mm/aaaa` es solo de presentación e ingreso (ver sección 4).
4. **Idioma de la interfaz:** español.

No hay nada pendiente de definir: el sistema **no requiere** cumplimiento legal de datos de salud
para este caso, ni configuración de base de datos, TLS o respaldos desde la aplicación (eso lo maneja
el operador).

---

## 3. Requisitos funcionales

### 3.1 Ficha del paciente
- Datos personales: nombre, documento de identidad, fecha de nacimiento (calcular edad automática),
  sexo, estado civil, dirección, teléfonos, correo, foto.
- **Cuidador principal y red de apoyo** (clave en geriatría): nombre, parentesco, teléfono, si
  convive con el paciente. Permitir varios contactos.
- Contacto de emergencia.
- Datos de seguro/obra social/previsión.
- Situación social: con quién vive, nivel de dependencia, situación habitacional.
- Antecedentes: patológicos, quirúrgicos, familiares, alergias (resaltadas en rojo siempre),
  hábitos (tabaco, alcohol).
- **Listado de condiciones crónicas / comorbilidades** (muy frecuentes en el adulto mayor).

### 3.2 Medicación (gestión de polifarmacia)
- Lista de medicamentos activos: fármaco, dosis, frecuencia, vía, fecha de inicio, indicado por.
- Historial de medicamentos suspendidos (con motivo y fecha).
- Marcar interacciones o alertas manuales.
- Vista de "conciliación de medicación" para revisar en cada consulta.
- (Avanzado, fase posterior) Soporte para revisar criterios **Beers** y **STOPP/START** como checklist.

### 3.3 Agenda y citas
- Calendario con vista día/semana/mes.
- Crear/editar/cancelar cita: paciente, fecha, hora, duración, motivo, tipo (primera vez / control /
  domiciliaria / teleconsulta), estado (programada, confirmada, atendida, ausente, cancelada).
- Recordatorios (al menos generar el recordatorio; el envío por WhatsApp/email es fase posterior).
- Vista "agenda de hoy" como pantalla de inicio.

### 3.4 Consultas (historia clínica longitudinal)
- Registrar consulta con formato **SOAP** (Subjetivo, Objetivo, Análisis/Evaluación, Plan).
- Signos vitales con seguimiento en el tiempo (PA, FC, FR, Tº, SatO2, peso, talla, IMC,
  circunferencia de pantorrilla).
- Vincular la consulta a su cita.
- Adjuntar documentos y escalas aplicadas ese día.
- **Línea de tiempo del paciente:** vista cronológica de todas las consultas, estudios y cambios
  relevantes, que es lo que permite ver la evolución a lo largo de los años.

### 3.5 Escalas y valoración geriátrica integral (VGI) — el diferenciador
Implementar como formularios que calculan el puntaje automáticamente y lo guardan con fecha, para
poder graficar su evolución:
- **Funcionalidad básica (ABVD):** Índice de Barthel, Índice de Katz.
- **Funcionalidad instrumental (AIVD):** Escala de Lawton-Brody.
- **Cognición:** Mini-Mental (MMSE), MoCA, Test del reloj, Pfeiffer.
- **Estado de ánimo:** Escala de Depresión Geriátrica de Yesavage (GDS).
- **Fragilidad:** criterios de Fried / escala FRAIL.
- **Riesgo de caídas:** Timed Up and Go, Tinetti.
- **Nutrición:** Mini Nutritional Assessment (MNA).
- **Comorbilidad:** Índice de Charlson.
- **Riesgo de úlceras por presión:** Braden o Norton.

Cada escala debe poder **graficarse a lo largo del tiempo** para un mismo paciente.

### 3.6 Documentos y estudios
- Subir archivos (PDF, imágenes, DICOM si es posible) de: laboratorios, imágenes (Rx, TC, RM, eco),
  informes de interconsulta, electrocardiogramas, etc.
- Categorizar por tipo de estudio y fecha de realización.
- Previsualización en el navegador.
- Permitir extraer/registrar valores clave (ej. resultados de laboratorio) para graficarlos.
- Almacenamiento: por defecto en disco local del servidor con ruta configurable; dejar la capa de
  almacenamiento abstraída para migrar a S3/compatible después.

### 3.7 Vacunación
- Registro de vacunas (influenza, neumococo, COVID, herpes zóster, etc.) con fechas y próximas dosis.

### 3.8 Plan de cuidados y alertas
- Plan de cuidados activo por paciente (objetivos, indicaciones, próximos controles).
- Panel de **alertas**: alergias, controles vencidos, escalas que empeoran, citas próximas.

### 3.9 Reportes / exportación
- Generar resumen del paciente en PDF (para derivaciones o para la familia).
- Exportar listado de medicación e indicaciones para entregar impreso al paciente/cuidador.

### 3.10 Gestión de usuarios, roles y perfiles (RBAC)
- **Usuarios:** alta, edición, desactivación (soft delete, nunca borrado físico), restablecimiento de
  contraseña. Cada usuario tiene email, nombre, estado (activo/inactivo) y rol.
- **Roles con permisos:** el sistema debe permitir crear y editar roles. Roles iniciales sugeridos:
  - **Administrador:** gestiona usuarios, roles y configuración del sistema; ve auditoría.
  - **Médico/a:** acceso clínico completo (pacientes, consultas, escalas, medicación, documentos).
  - **Recepción/Secretaría:** agenda y datos administrativos del paciente; sin acceso a la historia
    clínica detallada ni a notas clínicas.
  - **Solo lectura:** consulta sin editar (ej. para auditoría o suplencias).
  - Permitir definir más roles a futuro sin tocar código (permisos guardados en base de datos).
- **Permisos por recurso/acción** (modelo `permission` tipo `recurso:acción`, ej. `patient:read`,
  `patient:write`, `appointment:write`, `user:manage`, `audit:read`). Un rol agrupa permisos.
- **Perfil de usuario:** cada usuario edita sus propios datos, foto, preferencias y cambia su
  contraseña. Las preferencias incluyen tamaño de fuente y, a futuro, otros ajustes de interfaz.
- **Aplicación de permisos en ambos lados:** el backend valida permisos en cada endpoint (la fuente
  de verdad); el frontend oculta/deshabilita lo que el usuario no puede hacer. Nunca confiar solo en
  el frontend.
- La primera vez que arranca el sistema debe crear (o pedir que se cree) un usuario **Administrador**
  inicial mediante un script de *seed*, no credenciales quemadas en el código.

---

## 4. Requisitos no funcionales

- **Seguridad a nivel de aplicación:**
  - Todo el acceso autenticado; contraseñas con bcrypt; sesiones con JWT en cookie httpOnly y
    `SameSite`. El flag `Secure` de la cookie debe ser **configurable por variable de entorno**
    (activable cuando el operador sirva por HTTPS, sin imponerlo).
  - **Control de acceso por roles (RBAC)** validado en el backend en cada endpoint.
  - **Registro de auditoría** (audit log): quién vio/modificó qué ficha y cuándo, incluyendo intentos
    de login.
  - **Endurecimiento:** Helmet para cabeceras de seguridad, CORS restringido al dominio del frontend
    (configurable), rate limiting en `/auth/login` y en la API, protección contra fuerza bruta
    (bloqueo temporal), validación/sanitización de todas las entradas con Zod.
  - Borrado lógico (soft delete), nunca borrado físico de historias clínicas ni de usuarios.
  - Variables sensibles en `.env`, nunca en el repositorio.
- **Infraestructura (la administra el operador, no la aplicación):** la configuración de Postgres,
  TLS/HTTPS (por ejemplo mediante reverse proxy) y los respaldos los gestiona el operador del
  servidor. La aplicación se conecta a Postgres mediante una cadena de conexión por variable de
  entorno y funciona detrás de un proxy si lo hay; no impone ni configura estos elementos.
- **Formato de fechas (obligatorio):**
  - Mostrar e ingresar siempre en **`dd/mm/aaaa`** (y `dd/mm/aaaa HH:mm` con hora, 24h).
  - Internamente almacenar en UTC/ISO 8601 en Postgres; convertir solo en la capa de presentación.
  - Centralizar el formateo en un único helper (`formatDate`/`parseDate`) con date-fns y locale `es`,
    para no repetir lógica. Los `<input>` de fecha deben aceptar/mostrar `dd/mm/aaaa`.
- **Usabilidad:** interfaz limpia, en español, con texto legible (tamaño de fuente ajustable en el
  perfil del usuario). Accesos rápidos a "paciente" y "agenda de hoy".
- **Mantenibilidad:** TypeScript estricto, validación con Zod en los bordes, código comentado en
  español donde aporte.

---

## 5. Modelo de datos inicial (Prisma — orientativo)

Entidades núcleo: `User`, `Role`, `Permission`, `Patient`, `Caregiver`, `Condition`, `Allergy`,
`Medication`, `Appointment`, `Consultation`, `VitalSign`, `AssessmentScale` (con `type` y `score` en
JSON), `Document`, `Vaccination`, `CarePlan`, `AuditLog`.

Relaciones clave:
- `User` N—1 `Role`; `Role` N—N `Permission` (permisos guardados en BD, editables sin tocar código).
- `User` tiene perfil/preferencias (puede ir embebido en `User` o en tabla `UserProfile`).
- `Patient` 1—N `Consultation`, `Medication`, `Document`, `AssessmentScale`, `VitalSign`,
  `Caregiver`, `Vaccination`.
- `Appointment` 1—1 (opcional) `Consultation`.
- Todo registro (clínico y usuarios) con `createdAt`, `updatedAt`, `deletedAt` (soft delete) y
  `createdById`.

Pide al modelo que proponga el `schema.prisma` completo en la Fase 0/1 y lo ajuste contigo.

---

## 6. Diseño de la API (Express, REST)

Convención: `/api/v1/...`, respuestas JSON, validación Zod en cada endpoint, manejo central de
errores, paginación en listados.

Recursos principales:
```
POST   /auth/login            GET  /auth/me            POST /auth/logout
PATCH  /auth/password         (cambiar la propia contraseña)
GET    /profile               PATCH /profile           (datos y preferencias del propio usuario)
GET    /users                 POST /users              GET  /users/:id        (requiere user:manage)
PATCH  /users/:id             (soft) DELETE /users/:id  POST /users/:id/reset-password
GET    /roles                 POST /roles              PATCH /roles/:id        (gestión de roles)
GET    /permissions           (catálogo de permisos disponibles)
GET    /audit                 (requiere audit:read)
GET    /patients              POST /patients           GET  /patients/:id
PATCH  /patients/:id          (soft) DELETE /patients/:id
GET    /patients/:id/consultations    POST /patients/:id/consultations
GET    /patients/:id/medications       POST /patients/:id/medications
GET    /patients/:id/documents         POST /patients/:id/documents   (multipart)
GET    /patients/:id/scales            POST /patients/:id/scales
GET    /patients/:id/vitals            POST /patients/:id/vitals
GET    /appointments?from=&to=         POST /appointments     PATCH /appointments/:id
GET    /dashboard/today
```
Cada endpoint declara el permiso requerido y un middleware lo valida antes de ejecutar.

---

## 7. Plan por fases (ejecutar en este orden)

**Fase 0 — Andamiaje + autenticación y RBAC.** Monorepo, Docker Compose con Postgres, Prisma
conectado, Express con healthcheck, Next.js con layout base y Tailwind. Modelos `User`, `Role`,
`Permission`. Autenticación (login con JWT en cookie httpOnly + Secure), middleware de permisos,
*seed* del usuario Administrador inicial y de los roles base. Helper central de formato de fecha
`dd/mm/aaaa`. README con pasos para levantar todo. *Entregable: `docker compose up` funciona, el
admin inicia sesión y los permisos se validan en el backend.*

**Fase 1 — Pacientes.** Modelo `Patient` + cuidadores, condiciones, alergias. CRUD completo:
listado con búsqueda, ficha de detalle, alta/edición. *Entregable: se pueden crear y ver pacientes.*

**Fase 2 — Agenda.** Calendario, CRUD de citas, pantalla "agenda de hoy" como inicio.

**Fase 3 — Consultas y signos vitales.** Consulta SOAP vinculada a cita, registro de vitales,
línea de tiempo del paciente.

**Fase 4 — Medicación.** Gestión de medicación activa/suspendida y vista de conciliación.

**Fase 5 — Documentos y estudios.** Subida, categorización y previsualización de archivos.

**Fase 6 — Escalas geriátricas.** Empezar por Barthel, Lawton, MMSE y Yesavage; gráficos de
evolución. Luego el resto.

**Fase 7 — Administración de usuarios y perfiles.** Pantallas para que el admin gestione usuarios y
roles (asignar permisos), y para que cada usuario edite su perfil, preferencias y contraseña. Vista
del audit log.

**Fase 8 — Extras y empaquetado.** Vacunación, plan de cuidados, panel de alertas, exportación a
PDF. Empaquetado para despliegue (Docker, variables de entorno documentadas, cookie `Secure`
configurable, CORS por dominio). La configuración del servidor, TLS y respaldos queda a cargo del
operador.

---

## 8. Instrucciones de trabajo para el asistente

- Todos los parámetros están definidos (sección 2): no hace falta preguntar nada antes de empezar.
- Construye **una fase a la vez**; al final de cada fase muestra los comandos para correrla.
- Mantén el código tipado y validado; nada de `any` sin justificación.
- Explica en español las decisiones de diseño no obvias.
- No introduzcas dependencias innecesarias; justifica cada librería nueva.
- Recuerda que son datos clínicos: nunca uses datos reales de prueba, usa datos ficticios.

---

### Nota sobre responsabilidad
El software es una herramienta de apoyo a la atención; no sustituye el criterio clínico de la
profesional. Los cálculos de escalas y las alertas son ayudas, no diagnósticos.
