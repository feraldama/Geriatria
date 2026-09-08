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
- **Fase 6** — escalas de valoración geriátrica (16 escalas): Barthel, Katz,
  Lawton-Brody, MMSE, MoCA, Test del reloj, Pfeiffer, Yesavage (GDS-15), Fried,
  FRAIL, Timed Up & Go, Tinetti, MNA, Charlson, Braden y Norton. Cuestionarios
  con **puntaje automático** (re-calculado y validado en el backend),
  **interpretación con color por nivel** (verde/ámbar/rojo) y **gráficos de
  evolución**. Agrupadas por categoría e integradas en la línea de tiempo.
- **Fase 7** — administración: **gestión de usuarios** (alta, edición,
  desactivación, restablecimiento de contraseña), **roles y permisos** editables
  (asignación desde la UI), **vista de auditoría** y **perfil propio** (datos,
  preferencias —tamaño de fuente aplicado a toda la interfaz— y cambio de
  contraseña). Navegación de administración filtrada por permisos.
- **Fase 8** — extras y empaquetado: **vacunación** (con próximas dosis y
  alertas de vencimiento), **plan de cuidados** (objetivos, indicaciones,
  próximos controles), **panel de alertas** en el inicio (vacunas/controles
  vencidos y escalas que empeoran), **resumen del paciente imprimible / PDF**, y
  **empaquetado con Docker** para despliegue.

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

- **Node.js 20** (ver `.nvmrc`; es la versión con la que se construyen las imágenes)
- **pnpm 11.8** (`corepack enable && corepack prepare pnpm@11.8.0 --activate`)
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
# Postgres queda en 127.0.0.1:5433 (solo loopback)

# Adminer (panel de administración de la base) no arranca por defecto:
docker compose --profile tools up -d adminer   # http://127.0.0.1:8080
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
- `JWT_SECRET` → un secreto largo y aleatorio, mínimo 32 caracteres
  (`openssl rand -base64 48`)
- `COOKIE_SECURE` → `true` solo si servís por HTTPS (si se omite, se deduce del
  entorno: `true` en producción)
- `TRUST_PROXY` → `true` **solo** si hay un reverse proxy delante
- `MAX_UPLOAD_MB` → tamaño máximo por documento subido (25 por defecto)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` → credenciales del admin inicial.
  **`ADMIN_PASSWORD` no tiene valor por defecto**: el seed falla si no la
  definís (mínimo 12 caracteres). Una contraseña de administrador conocida
  daría acceso total a la historia clínica de todos los pacientes.

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
pnpm dev          # API (http://localhost:3027) + Web (http://localhost:3028)
```

O por separado:

```bash
pnpm dev:api
pnpm dev:web
```

Entrá a **http://localhost:3028**, iniciá sesión con el `ADMIN_EMAIL` /
`ADMIN_PASSWORD` que configuraste y cambiá la contraseña.

## Verificación de la Fase 0

- `GET http://localhost:3027/health` responde `{ "status": "ok", "db": "up" }`.
- El admin inicia sesión y ve el panel "Agenda de hoy".
- Los endpoints protegidos (`/api/v1/auth/me`) devuelven 401 sin sesión.
- Los permisos se validan en el backend (RBAC) en cada endpoint.

```bash
pnpm typecheck      # chequeo de tipos de todo el monorepo
pnpm lint           # ESLint
pnpm test           # tests (API + schemas compartidos)
pnpm format         # formatea con Prettier
pnpm format:check   # verifica formato sin escribir
```

Estos mismos pasos corren en CI (`.github/workflows/ci.yml`) en cada push y
pull request, junto con el build de las imágenes Docker.

> `apps/api` y `apps/web` consumen `@geriatria/schemas` **compilado**
> (`packages/schemas/dist`), no el código fuente. Por eso sus scripts `test` y
> `typecheck` corren antes el build del paquete: si no, un cambio en
> `packages/schemas/src` no se ve y se terminan depurando fallos fantasma
> contra código viejo.

## Despliegue (producción)

El sistema se sirve desde un servidor accesible por internet. **La
infraestructura (TLS/HTTPS, respaldos de Postgres y secretos) la administra el
operador**, no la aplicación. El frontend (`web`) es el punto de entrada público
y reenvía `/api/v1/*` al backend por la red interna; el operador coloca un
**reverse proxy con HTTPS** por delante de `web`.

Stack completo con Docker:

```bash
# 1) Definí los secretos en un archivo .env junto al compose. Son obligatorios
#    (el compose falla si faltan): POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGIN,
#    ADMIN_PASSWORD.
# 2) Construí y levantá:
docker compose -f docker-compose.prod.yml up -d --build
# 3) Aplicá las migraciones (después del respaldo, ver abajo):
docker compose -f docker-compose.prod.yml run --rm migrate
# 4) Creá el administrador inicial (una sola vez):
docker compose -f docker-compose.prod.yml exec api pnpm db:seed
```

- Las **migraciones** NO se aplican al arrancar la API: van en el servicio
  one-shot `migrate`, para que se ejecuten después del respaldo y no se solapen
  si el contenedor se reinicia en bucle. **Hacé un respaldo antes de cada
  `migrate`.**
- ⚠️ **Antes de aplicar la migración `20260806000000_hardening_auditoria_indices`
  por primera vez**, verificá que no haya cédulas repetidas: esa migración crea
  un índice único y, si hay duplicados, Postgres revierte la migración completa.

  ```sql
  SELECT "documentId", count(*)
  FROM "Patient"
  WHERE "documentId" IS NOT NULL AND "deletedAt" IS NULL
  GROUP BY "documentId" HAVING count(*) > 1;
  ```

  Cada grupo hay que resolverlo a mano (fusionar las fichas o dar de baja la
  incorrecta): unificar historias clínicas no es algo que deba hacer un script.
- El puerto público de `web` se publica **solo en loopback**
  (`127.0.0.1:3028`): el reverse proxy con TLS del operador es el único punto de
  entrada. Para exponerlo en otra interfaz, definí `WEB_BIND`.
- La cookie de sesión usa el flag **`Secure` configurable** (`COOKIE_SECURE=true`
  cuando hay HTTPS) y **`CORS` restringido** al dominio del frontend.
- Los **documentos subidos** persisten en el volumen `storage`; los **respaldos**
  de ese volumen y de Postgres quedan a cargo del operador.
- Zona horaria fija (`TZ=America/Asuncion`) para que la agenda interprete bien
  las horas independientemente del host.

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

- Contraseñas con bcrypt; sesión JWT (HS256, con issuer/audience fijos) en
  cookie `httpOnly` + `SameSite=Lax`, flag `Secure` según entorno.
- Cambiar o restablecer la contraseña **invalida las sesiones abiertas**
  (el token lleva una versión que se compara en cada petición).
- RBAC validado en el backend en cada endpoint. Un test recorre todas las rutas
  registradas y falla si alguna queda sin `requireAuth` o sin permiso.
- Nadie puede otorgar permisos que no tiene, editar los roles del sistema,
  modificar su propio rol ni dejar la instalación sin administradores.
- Helmet en la API y CSP + `frame-ancestors: none` en las páginas de Next;
  CORS restringido al dominio del frontend; rate limiting general, de login y
  de cambio/restablecimiento de contraseña; bloqueo temporal por fuerza bruta
  con contador atómico en la base.
- Los documentos subidos se validan por tipo y tamaño, se guardan bajo un id
  verificado (sin recorrido de rutas) y se sirven con `nosniff` y CSP `sandbox`.
- Borrado lógico (`deletedAt`), nunca físico, en usuarios, historias clínicas y
  sub-entidades del paciente (alergias, condiciones, cuidadores).
- Las consultas se **versionan**: cada edición archiva el estado anterior en
  `ConsultationRevision` antes de sobrescribir.
- Registro de auditoría con el **antes/después** de cada modificación, además
  de los accesos de lectura a datos clínicos y los intentos de login.

### Endurecimiento pendiente (a cargo del operador)

- **Respaldos** de la base y del volumen `storage`, con prueba de restauración.
- Hacer la tabla `AuditLog` de solo-inserción para el usuario de la aplicación:
  `REVOKE UPDATE, DELETE ON "AuditLog" FROM <usuario_app>;`

---

> El software es una herramienta de apoyo; no sustituye el criterio clínico de la
> profesional. Los cálculos de escalas y las alertas son ayudas, no diagnósticos.
