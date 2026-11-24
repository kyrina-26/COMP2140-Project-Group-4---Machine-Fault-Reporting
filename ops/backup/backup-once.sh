#!/usr/bin/env bash
set -euo pipefail

: "${MYSQL_HOST:?MYSQL_HOST is required}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
partial="${BACKUP_DIR}/.partial-${timestamp}"
complete="${BACKUP_DIR}/backup-${timestamp}"
mkdir -p "${BACKUP_DIR}"
mkdir "${partial}"
trap 'rm -rf -- "${partial}"' EXIT

echo "[$(date -u +%FT%TZ)] Starting backup ${timestamp}."

# Dump the database first. Uploads are append-only in the current application:
# file bytes are written before their metadata row, so a concurrent upload can
# at worst leave an unreferenced file in this backup, not a report pointing to
# a missing file.
mysqldump \
  --ssl-mode=DISABLED \
  --host="${MYSQL_HOST}" \
  --user="${MYSQL_USER}" \
  --password="${MYSQL_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --no-tablespaces \
  "${MYSQL_DATABASE}" | gzip -1 > "${partial}/database.sql.gz"

tar -czf "${partial}/uploads.tar.gz" -C /uploads .
(cd "${partial}" && sha256sum database.sql.gz uploads.tar.gz > SHA256SUMS)
touch "${partial}/COMPLETE"
mv "${partial}" "${complete}"
trap - EXIT

# Keep complete daily sets for 30 days. Pruning runs only after a new set succeeds.
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -name 'backup-*' -mtime +30 -exec rm -rf -- {} +
echo "[$(date -u +%FT%TZ)] Backup completed: ${complete}."

\n