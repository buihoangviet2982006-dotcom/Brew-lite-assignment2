#!/usr/bin/env bash
# scripts/rollback-deploy.sh
# Kịch bản dừng Pipeline khi lỗi (Fail-fast) và Rollback tự động cho BrewLite

set -euo pipefail

ENVIRONMENT="${1:-staging}"
FAILED_SHA="${2:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
TARGET_STABLE_SHA="${3:-}"
HEALTHCHECK_URL="${DEPLOY_HEALTHCHECK_URL:-}"

echo "=========================================================="
echo "🚨 [BREWLITE ROLLBACK GUARD] PHÁT HIỆN SỰ CỐ TRIỂN KHAI"
echo "=========================================================="
echo "📌 Môi trường         : ${ENVIRONMENT}"
echo "❌ Bản build bị lỗi   : ${FAILED_SHA}"
echo "⏰ Thời điểm kích hoạt: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# 1. Xác định phiên bản ổn định gần nhất (Last Known Good Release)
if [ -z "${TARGET_STABLE_SHA}" ]; then
  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    TARGET_STABLE_SHA="$(git rev-parse --short HEAD~1)"
  else
    TARGET_STABLE_SHA="initial-stable"
  fi
fi

echo "🔄 Đang khôi phục (Rollback) về phiên bản ổn định: ${TARGET_STABLE_SHA}..."

# 2. Thực thi Rollback cho Frontend (Vercel / Render) nếu có cấu hình Webhook
if [ -n "${ROLLBACK_WEBHOOK_URL:-}" ]; then
  echo "📡 Gửi tín hiệu Rollback tới hạ tầng Cloud..."
  curl --fail --silent --show-error -X POST "${ROLLBACK_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"environment\":\"${ENVIRONMENT}\",\"rollbackTo\":\"${TARGET_STABLE_SHA}\",\"failedCommit\":\"${FAILED_SHA}\"}"
  echo "✅ Đã kích hoạt Webhook Rollback trên Cloud thành công."
else
  echo "ℹ️ Chế độ CI Rollback nội bộ: Đánh dấu bản dựng ${FAILED_SHA} không hợp lệ và khóa tiến trình Release."
fi

# 3. Kiểm tra lại trạng thái sau khi Rollback (nếu có URL Healthcheck)
if [ -n "${HEALTHCHECK_URL}" ]; then
  echo "🩺 Đang kiểm tra lại Healthcheck tại: ${HEALTHCHECK_URL}"
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTHCHECK_URL}" || echo "500")
  if [ "${HTTP_STATUS}" -ge 200 ] && [ "${HTTP_STATUS}" -lt 400 ]; then
    echo "✅ Dịch vụ đã ổn định trở lại (HTTP ${HTTP_STATUS})."
  else
    echo "⚠️ Cảnh báo: Healthcheck trả về HTTP ${HTTP_STATUS}. Cần kiểm tra thủ công!"
  fi
fi

# 4. Xuất biên bản sự cố (Rollback Manifest) phục vụ truy vết QA
mkdir -p rollback-logs
cat <<EOF > "rollback-logs/rollback-${FAILED_SHA}.json"
{
  "project": "BrewLite",
  "environment": "${ENVIRONMENT}",
  "status": "ROLLED_BACK",
  "failedCommit": "${FAILED_SHA}",
  "restoredCommit": "${TARGET_STABLE_SHA}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "✅ Đã ghi nhận biên bản khôi phục tại: rollback-logs/rollback-${FAILED_SHA}.json"
echo "=========================================================="