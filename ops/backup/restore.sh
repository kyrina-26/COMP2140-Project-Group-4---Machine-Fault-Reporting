#!/usr/bin/env bash
set -euo pipefail

: "${MYSQL_HOST:?MYSQL_HOST is required}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
: "${RESTORE_SET:?Set RESTORE_SET to a backup directory name}"

if [[ "${ALLOW_DESTRUCTIVE_RESTORE:-NO}" != "YES" ]]; then
  echo "Refusing restore: set ALLOW_DESTRUCTIVE_RESTORE=YES to replace the current database and uploads." >&2
  exit 2
fi

# Accept only a direct child name, never an arbitrary path.
if [[ ! "${RESTORE_SET}" =~ ^backup-[0-9]{8}T[0-9]{6}Z$ ]]; then
  echo "Invalid backup set name: ${RESTORE_SET}" >&2
  exit 2
fi

set_dir="${BACKUP_DIR}/${RESTORE_SET}"
if [[ ! -f "${set_dir}/COMPLETE" || ! -f "${set_dir}/database.sql.gz" || ! -f "${set_dir}/uploads.tar.gz" ]]; then
  echo "Backup set is incomplete: ${set_dir}" >&2
  exit 2
fi

(cd "${set_dir}" && sha256sum -c SHA256SUMS)
gzip -t "${set_dir}/database.sql.gz"
tar -tzf "${set_dir}/uploads.tar.gz" >/dev/null

echo "Restoring ${RESTORE_SET} into database ${MYSQL_DATABASE} and the current uploads volume."
echo "The app API must be stopped first; this replaces its current application data."

# The dump contains table DROP/CREATE statements and is deliberately imported
# with MySQL's root account so existing tables are replaced reliably.
gzip -dc "${set_dir}/database.sql.gz" | mysql \
  --ssl-mode=DISABLED \
  --host="${MYSQL_HOST}" \
  --user=root \
  --password="${MYSQL_ROOT_PASSWORD}" \
  "${MYSQL_DATABASE}"

# Only clear the app uploads volume after the database import has succeeded.
find /uploads -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
tar -xzf "${set_dir}/uploads.tar.gz" -C /uploads
echo "Restore completed. Start the API and verify reports and attachments."

\n