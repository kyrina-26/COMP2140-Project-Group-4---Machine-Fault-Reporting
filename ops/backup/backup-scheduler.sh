#!/usr/bin/env bash
set -u

# Run at 03:15 in the configured TZ. Backup names and log timestamps remain UTC.
# A manual backup is available by running backup-once.sh directly.
while true; do
  hour="$(date +%H)"
  minute="$(date +%M)"
  second="$(date +%S)"
  now=$((10#${hour} * 3600 + 10#${minute} * 60 + 10#${second}))
  target=$((3 * 3600 + 15 * 60))
  delay=$(((target - now + 86400) % 86400))
  if (( delay == 0 )); then delay=86400; fi
  sleep "${delay}"
  if ! /usr/local/bin/backup-once.sh; then
    echo "[$(date -u +%FT%TZ)] Backup failed; see preceding error output." >&2
  fi
done

\n