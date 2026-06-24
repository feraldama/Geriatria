# Sistema de Gestión Clínica para Geriatría

Sistema de gestión clínica para una médica especialista en geriatría, pensado
para el seguimiento longitudinal de pacientes adultos mayores. Se construye **por
fases**.

Fases implementadas:
- **Fase 0** — andamiaje del monorepo, autenticación (JWT en cookie httpOnly) y
  control de acceso por roles (RBAC).
- **Fase 1** — gestión de pacientes: ficha completa (datos personales, contacto,
  emergencia, seguro, situación social, antecedentes), cuidadores/red de apoyo,
  condiciones crónicas y alergias. Listado con **búsqueda (insensible a acentos)
  y paginación en el backend**, alta, edición y baja lógica.
- **Fase 2** — agenda: calendario con vistas **día / semana / mes**, alta/edición
  de citas (paciente, fecha, hora, duración, motivo, tipo, estado), cambios
  rápidos de estado (confirmar / atendida / ausente / cancelar) y baja lógica.
  Pantalla de inicio **"agenda de hoy"** con las citas del día.
- **Fase 3** — consultas y signos vitales: consulta en formato **SOAP** (con
  signos vitales opcionales e **IMC calculado**), vinculable a una cita (que
  pasa a *atendida*), edición de consultas, **registro de vitales con
  seguimiento en el tiempo** y **línea de tiempo** del paciente (consultas +
  citas). Sub-navegación de la ficha por permisos (recepción no ve la historia
  clínica).
- **Fase 4** — medicación (polifarmacia): **conciliación de medicación activa**
  (con las alergias del paciente a la vista), alta/edición (fármaco, dosis,
  frecuencia, vía, inicio, indicado por), **alertas/interacciones manuales**
  resaltadas, **suspensión con motivo y fecha**, reactivación e historial.
- **Fase 5** — documentos y estudios: **subida de archivos** (PDF, imágenes,
  DICOM) con categoría (laboratorio, imagen, interconsulta, ECG, otro) y fecha
  de realización, **previsualización en el navegador** (imágenes y PDF),
  descarga y baja lógica. Almacenamiento en disco con ruta configurable
  (`STORAGE_DIR`) y capa abstraída para migrar a S3 más adelante.
- **Fase 6** — escalas de valoración geriátrica: **Barthel, Lawton-Brody,
  Mini-Mental (MMSE) y Yesavage (GDS-15)** como cuestionarios con **puntaje
  automático** (re-calculado y validado en el backend), interpretación clínica
  y **gráficos de evolución** en el tiempo. Integradas en la línea de tiempo.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query
- **Backend:** Node.js + Express + TypeScript (servicio separado)
- **Base de datos:** PostgreSQL + Prisma (ORM)
- **Validación:** Zod (compartida vía `packages/schemas`)
- **Auth:** JWT en cookie `httpOnly` + bcrypt
- **Fechas:** date-fns, formato `dd/mm/aaaa` en toda la UI
- **Diseño:** skill [ui-ux-pro-max](.claude/skills/ui-ux-pro-max) — design system en
  `apps/web/design-system/`

## Estructura (monorepo pnpm)

```
/apps
  /web      → Next.js (frontend)
  /api      → Express + Prisma (backend)
/packages
  /schemas  → esquemas Zod, permisos y helper de fechas (compartido)
  /config   → tsconfig base + ESLint compartido
docker-compose.yml  → Postgres + Adminer (opcional; ver más abajo)
```

## Requisitos

- **Node.js ≥ 20** y **pnpm ≥ 9** (`npm i -g pnpm`)
- **PostgreSQL** accesible (local, remoto, o vía Docker)
- **Python 3** (solo para usar la skill de diseño; opcional)

## Puesta en marcha (desarrollo)

### 1. Base de datos

Tenés dos opciones:

**A) Usar un PostgreSQL ya instalado** (lo que usamos en este entorno):
crea una base `geriatria` y apuntá `DATABASE_URL` a ella (ver paso 2).

**B) Levantarla con Docker** (si preferís contenedores):

```bash
docker compose up -d
# Postgres queda en localhost:5433, Adminer en http://localhost:8080
```

> En **producción**, la infraestructura (Postgres, TLS/HTTPS, respaldos) la
> administra el operador del servidor. La app solo consume `DATABASE_URL` y
> funciona detrás de un reverse proxy.

### 2. Variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Editá `apps/api/.env`:
- `DATABASE_URL` → tu conexión a Postgres
- `JWT_SECRET` → un secreto largo y aleatorio (`openssl rand -base64 48`)
- `COOKIE_SECURE` → `true` solo si servís por HTTPS
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` → credenciales del admin inicial

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Preparar la base de datos (Prisma)

```bash
pnpm --filter @geriatria/api db:generate        # genera el cliente Prisma
pnpm --filter @geriatria/api db:migrate          # crea las tablas
pnpm --filter @geriatria/api db:seed             # admin + roles + permisos
pnpm --filter @geriatria/api db:seed:patients        # (opcional) pacientes ficticios de prueba
pnpm --filter @geriatria/api db:seed:appointments    # (opcional) citas ficticias de prueba
```

### 5. Levantar todo

```bash
pnpm dev          # API (http://localhost:4000) + Web (http://localhost:3000)
```

O por separado:

```bash
pnpm dev:api
pnpm dev:web
```

Entrá a **http://localhost:3000**, iniciá sesión con el `ADMIN_EMAIL` /
`ADMIN_PASSWORD` que configuraste y cambiá la contraseña.

## Verificación de la Fase 0

- `GET http://localhost:4000/health` responde `{ "status": "ok", "db": "up" }`.
- El admin inicia sesión y ve el panel "Agenda de hoy".
- Los endpoints protegidos (`/api/v1/auth/me`) devuelven 401 sin sesión.
- Los permisos se validan en el backend (RBAC) en cada endpoint.

```bash
pnpm typecheck    # chequeo de tipos de todo el monorepo
pnpm test         # tests (API)
```

## Roles base sembrados

| Rol            | Permisos                                                       |
|----------------|----------------------------------------------------------------|
| Administrador  | Todos                                                           |
| Médico/a       | Pacientes, agenda y toda la historia clínica                   |
| Recepción      | Pacientes y agenda (sin historia clínica)                      |
| Solo lectura   | Ver pacientes, agenda y clínica (sin editar)                   |

Los permisos se guardan en base de datos (`recurso:acción`) y son editables sin
tocar código (se gestionarán desde la UI en la Fase 7).

## Notas de seguridad (nivel aplicación)

- Contraseñas con bcrypt; sesión JWT en cookie `httpOnly` + `SameSite=Lax`,
  flag `Secure` configurable por env.
- RBAC validado en el backend en cada endpoint.
- Helmet, CORS restringido al dominio del frontend, rate limiting (general y en
  `/auth/login`), bloqueo temporal por fuerza bruta.
- Borrado lógico (`deletedAt`), nunca físico, en usuarios e historias clínicas.
- Registro de auditoría (incluye intentos de login).

---

> El software es una herramienta de apoyo; no sustituye el criterio clínico de la
> profesional. Los cálculos de escalas y las alertas son ayudas, no diagnósticos.
