#!/usr/bin/env bash
# Despliega el commit actual (HEAD) de Geriatría en el VPS.
#
#   bash scripts/desplegar-vps.sh
#
#   1. Sube `git archive HEAD`: sólo lo commiteado viaja.
#   2. Instala y compila en una carpeta NUEVA; si algo falla, lo que corre no se tocó.
#   3. Revisa las migraciones PENDIENTES: si alguna puede editar o borrar datos
#      (DROP, DELETE, TRUNCATE, UPDATE, cambio de tipo), se detiene. Es la regla
#      de CLAUDE.local.md: un despliegue sólo agrega estructura. Para aplicarla
#      igual, después de revisarla: FORZAR_MIGRACION=1 bash scripts/desplegar-vps.sh
#   4. Respaldo (base + estudios) ANTES de `prisma migrate deploy`.
#   5. Cambia `current` y reinicia. Quedan las últimas 3 versiones.
#
# Requiere la clave ~/.ssh/kinesio_vps (el mismo VPS que Kinesio Escor).
set -euo pipefail

SERVIDOR="${GERIATRIA_VPS:-root@179.197.76.228}"
CLAVE="${GERIATRIA_VPS_CLAVE:-$HOME/.ssh/kinesio_vps}"

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "⚠ Hay cambios sin commitear: NO se despliegan (sólo viaja HEAD)." >&2
fi
SHA=$(git rev-parse --short HEAD)
PAQUETE="$(mktemp -d)/geriatria-$SHA.tgz"
git archive --format=tar.gz -o "$PAQUETE" HEAD
echo "→ Subiendo $SHA"
scp -q -i "$CLAVE" "$PAQUETE" "$SERVIDOR:/tmp/geriatria-$SHA.tgz"
rm -f "$PAQUETE"

ssh -i "$CLAVE" -o BatchMode=yes "$SERVIDOR" "SHA=$SHA FORZAR_MIGRACION=${FORZAR_MIGRACION:-0} bash -s" <<'REMOTO'
set -euo pipefail
BASE=/opt/geriatria
R=$BASE/releases/$SHA-$(date +%Y%m%d%H%M%S)
SERV="geriatria-api geriatria-web"
run() {
  sudo -u geriatria -H bash -c 'set -a; . /opt/geriatria/shared/.env; set +a; cd "$0" && exec env HOME=/opt/geriatria COREPACK_ENABLE_DOWNLOAD_PROMPT=0 CI=1 "$@"' "$R" "$@"
}

install -d -o geriatria -g geriatria "$R"
tar -xzf "/tmp/geriatria-$SHA.tgz" -C "$R"; rm -f "/tmp/geriatria-$SHA.tgz"
for d in . apps/api apps/web; do ln -sf $BASE/shared/.env "$R/$d/.env"; done
# En producción no se siembra NUNCA: los seeds borran registros para ser
# idempotentes. Sin los archivos, `db:seed` y compañía no tienen qué correr,
# aunque alguien los tipee a mano. (seed.ts además se niega con NODE_ENV=production.)
rm -f "$R"/apps/api/prisma/seed*.ts
if ls "$R"/apps/api/prisma/seed*.ts >/dev/null 2>&1; then echo "✗ quedaron seeds en el release"; exit 1; fi
chown -R geriatria:geriatria "$R"

echo "→ Instalando dependencias"
# NODE_ENV=production (del .env) haría que pnpm se saltee las devDependencies,
# que son las que compilan (tsup, typescript, prisma).
run env NODE_ENV=development corepack pnpm install --frozen-lockfile 2>&1 | tail -1
run corepack pnpm --filter @geriatria/api run db:generate 2>&1 | grep -iE "generated|error" | head -1

echo "→ Compilando"
run corepack pnpm build 2>&1 | grep -iE "error|✓ Compiled" | tail -3
test -f "$R/apps/api/dist/index.cjs" && test -f "$R/apps/web/.next/BUILD_ID"

echo "→ Revisando migraciones pendientes"
APLICADAS=$(sudo -u postgres /usr/pgsql-18/bin/psql -d geriatria -Atc "select migration_name from _prisma_migrations where finished_at is not null")
PELIGROSAS=""
for m in "$R"/apps/api/prisma/migrations/*/; do
  n=$(basename "$m"); grep -qxF "$n" <<<"$APLICADAS" && continue
  echo "  pendiente: $n"
  if grep -qiE '\b(DROP|DELETE|TRUNCATE|UPDATE)\b|ALTER COLUMN .* TYPE' "$m/migration.sql"; then
    PELIGROSAS="$PELIGROSAS $n"
  fi
done
if [ -n "$PELIGROSAS" ] && [ "$FORZAR_MIGRACION" != 1 ]; then
  echo "✗ Estas migraciones pueden editar o borrar datos:$PELIGROSAS"
  echo "  Revisalas. Si son seguras: FORZAR_MIGRACION=1 bash scripts/desplegar-vps.sh"
  echo "  (Si borran una tabla, la base lo va a rechazar igual: ver geriatria-proteccion.sql)"
  rm -rf "$R"; exit 1
fi

echo "→ Respaldo previo a migrar"
/usr/local/bin/geriatria-respaldo

echo "→ Migraciones"
sudo -u geriatria -H bash -c 'set -a; . /opt/geriatria/shared/.env; set +a; cd "$0/apps/api" && exec env HOME=/opt/geriatria ./node_modules/.bin/prisma migrate deploy' "$R" 2>&1 | grep -iE "applied|no pending|error" | tail -3

echo "→ Activando"
ln -sfn "$R" $BASE/current
systemctl restart $SERV
sleep 8
for s in $SERV; do systemctl is-active --quiet "$s" || { echo "✗ $s no arrancó"; exit 1; }; done
curl -fsS -o /dev/null http://127.0.0.1:13027/health

ACTUAL=$(readlink -f $BASE/current)
ls -1dt $BASE/releases/*/ | sed 's#/$##' | grep -vxF "$ACTUAL" | tail -n +3 | xargs -r rm -rf
echo "✓ Desplegado $(basename "$R")"
REMOTO
