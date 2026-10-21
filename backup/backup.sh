#!/bin/sh
# ============================================================
# RKS Backup Service
# Runs pg_dump daily at BACKUP_SCHEDULE_HOUR
# ============================================================

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_HOUR="${BACKUP_SCHEDULE_HOUR:-2}"

mkdir -p "$BACKUP_DIR"

run_backup() {
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  FILENAME="$BACKUP_DIR/rks_backup_${TIMESTAMP}.sql.gz"
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] Starting backup → $FILENAME"
  
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-password \
    | gzip > "$FILENAME"
  
  if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] Backup SUCCESS → $FILENAME"
    # Keep last 30 backups, delete older
    ls -tp "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --
    echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] Cleanup done. Kept last 30 backups."
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] Backup FAILED!"
    rm -f "$FILENAME"
  fi
}

echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] Backup service started. Scheduled at ${BACKUP_HOUR}:00 IST daily."

# Run immediately on startup if no backups exist yet
if [ -z "$(ls -A $BACKUP_DIR/*.sql.gz 2>/dev/null)" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] No existing backups found. Running initial backup..."
  run_backup
fi

# Main loop — check every minute, run at configured hour
while true; do
  CURRENT_HOUR=$(date +"%H")
  CURRENT_MIN=$(date +"%M")
  
  if [ "$CURRENT_HOUR" = "$(printf '%02d' $BACKUP_HOUR)" ] && [ "$CURRENT_MIN" = "00" ]; then
    run_backup
    sleep 61  # Skip the rest of this minute to avoid double-run
  fi
  
  sleep 60
done
