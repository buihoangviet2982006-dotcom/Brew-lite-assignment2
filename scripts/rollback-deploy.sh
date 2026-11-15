#!/usr/bin/env bash
set -e

ENVIRONMENT="${1:-staging}"
FAILED_SHA="${2:-unknown}"
TARGET_STABLE_SHA="${3:-HEAD~1}"

echo "=========================================================="
echo "[BREWLITE ROLLBACK GUARD] KICH HOAT QUY TRINH ROLLBACK"
echo "=========================================================="
echo "Moi truong         : ${ENVIRONMENT}"
echo "Ban dựng kiem tra  : ${FAILED_SHA}"
echo "Phien ban khoi phuc: ${TARGET_STABLE_SHA}"

mkdir -p rollback-logs
cat <<EOF > "rollback-logs/rollback-status.json"
{
  "project": "BrewLite",
  "environment": "${ENVIRONMENT}",
  "status": "GUARD_ACTIVE",
  "checkedCommit": "${FAILED_SHA}",
  "fallbackTarget": "${TARGET_STABLE_SHA}"
}
EOF

echo "Da luu bien ban Rollback tai rollback-logs/rollback-status.json"
echo "=========================================================="