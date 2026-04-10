#!/usr/bin/env bash
set -euo pipefail

DB_URL="${1:-}"
SCHEMA_PATH="${2:-database/schema.sql}"

if [[ -z "$DB_URL" ]]; then
  if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    DB_URL="$SUPABASE_DB_URL"
  elif [[ -f "backend/.env" ]]; then
    DB_URL="$(awk -F= '/^SUPABASE_DB_URL=/{sub(/^SUPABASE_DB_URL=/,""); print; exit}' backend/.env)"
  fi
fi

if [[ -z "$DB_URL" ]]; then
  echo "SUPABASE_DB_URL not found. Pass as arg or set in backend/.env"
  exit 1
fi

if [[ ! -f "$SCHEMA_PATH" ]]; then
  echo "Schema file not found: $SCHEMA_PATH"
  exit 1
fi

echo "Applying schema file: $SCHEMA_PATH"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_PATH"
echo "Schema apply complete."
