#!/usr/bin/env bash
set -e

ENVIRONMENT="${1:-staging}"
FAILED_SHA="${2:-unknown}"
TARGET_STABLE_SHA="${3:-HEAD~1}"

echo "=========================================================="
echo "[BREWLITE ROLLBACK GUARD] KICH HOAT QUY TRINH ROLLBACK"
echo "=========================================================="
echo "Moi truong         : ${ENVIRONMENT}"
echo "Ban dung kiem tra  : ${FAILED_SHA}"
echo "Phien ban khoi phuc: ${TARGET_STABLE_SHA}"

WEBHOOK_TRIGGERED="false"
if [ -n "${ROLLBACK_WEBHOOK_URL:-}" ]; then
  echo "Dang gui tin hieu rollback toi ROLLBACK_WEBHOOK_URL..."
  curl --fail --silent --show-error \
    --request POST \
    -H "Content-Type: application/json" \
    -d "{\"environment\":\"${ENVIRONMENT}\",\"failedSha\":\"${FAILED_SHA}\",\"targetSha\":\"${TARGET_STABLE_SHA}\"}" \
    "${ROLLBACK_WEBHOOK_URL}" >/dev/null
  WEBHOOK_TRIGGERED="true"
  echo "Da gui tin hieu rollback thanh cong."
else
  echo "Chua cau hinh ROLLBACK_WEBHOOK_URL; ghi nhan bien ban audit va huong dan rollback thu cong."
fi

mkdir -p rollback-logs
cat <<EOF > "rollback-logs/rollback-status.json"
{
  "project": "BrewLite",
  "environment": "${ENVIRONMENT}",
  "status": "GUARD_ACTIVE",
  "checkedCommit": "${FAILED_SHA}",
  "fallbackTarget": "${TARGET_STABLE_SHA}",
  "webhookTriggered": ${WEBHOOK_TRIGGERED}
}
EOF

echo "Da luu bien ban Rollback tai rollback-logs/rollback-status.json"
echo "=========================================================="
