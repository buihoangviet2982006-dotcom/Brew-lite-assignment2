"use client";

import { useCallback, useEffect, useState } from "react";
import {
  pollOrderPaymentStatus,
  simulateSepaySandboxWebhook,
} from "../../lib/payment-api";
import type {
  PaymentApiError,
  PaymentResultResponse,
} from "../../types/payment";
import styles from "../../app/checkout/checkout.module.css";

export interface VietQrPaymentModalProps {
  payment: PaymentResultResponse;
  token: string;
  onPaymentSucceeded: (finalPayment: PaymentResultResponse) => void;
  onPaymentFailed: (errorMessage: string) => void;
  onClose: () => void;
}

export function VietQrPaymentModal({
  payment,
  token,
  onPaymentSucceeded,
  onPaymentFailed,
  onClose,
}: VietQrPaymentModalProps) {
  const [pollCount, setPollCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState(
    "Hệ thống đang tự động kiểm tra biến động số dư qua SePay Sandbox mỗi 3 giây..."
  );

  const checkPaymentStatus = useCallback(
    async (isManual = false) => {
      try {
        if (isManual) {
          setIsPolling(true);
        }
        const latest = await pollOrderPaymentStatus(payment.orderId, token);
        setPollCount((c) => c + 1);

        if (latest.status === "SUCCEEDED" || latest.orderStatus === "PAID") {
          onPaymentSucceeded(latest);
          return;
        }

        if (
          latest.status === "FAILED" ||
          latest.orderStatus === "PAYMENT_FAILED"
        ) {
          onPaymentFailed(
            "Giao dịch thanh toán không thành công. Hệ thống đã hoàn trả tồn kho đồ uống."
          );
          return;
        }

        if (isManual) {
          setStatusNote(
            "Chưa ghi nhận giao dịch chuyển khoản khớp mã. Hệ thống vẫn đang tiếp tục tự động kiểm tra..."
          );
        }
      } catch (err) {
        const apiErr = err as PaymentApiError;
        if (isManual) {
          setStatusNote(
            apiErr.message || "Không thể kiểm tra trạng thái lúc này."
          );
        }
      } finally {
        if (isManual) {
          setIsPolling(false);
        }
      }
    },
    [payment.orderId, token, onPaymentSucceeded, onPaymentFailed]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      void checkPaymentStatus(false);
    }, 3000);

    return () => clearInterval(timer);
  }, [checkPaymentStatus]);

  const handleCopy = async (label: string, text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
      }
    } catch {
      // Bỏ qua lỗi clipboard trên trình duyệt hạn chế quyền
    }
  };

  const handleSimulateWebhook = async (
    scenario: "SUCCESS" | "MOCK_FAIL" | "TIMEOUT"
  ) => {
    try {
      setIsSimulating(true);
      await simulateSepaySandboxWebhook({
        orderId: payment.orderId,
        method: payment.method,
        transferAmount: payment.amount,
        scenario,
        idempotencyKey: payment.idempotencyKey,
      });

      const updated = await pollOrderPaymentStatus(payment.orderId, token);
      if (updated.status === "SUCCEEDED" || updated.orderStatus === "PAID") {
        onPaymentSucceeded(updated);
      }
    } catch (err) {
      const apiErr = err as PaymentApiError;
      onPaymentFailed(
        apiErr.message ||
          "Giao dịch bị từ chối hoặc quá thời gian chờ. Đã hoàn trả tồn kho."
      );
    } finally {
      setIsSimulating(false);
    }
  };

  const methodLabel =
    payment.method === "WALLET"
      ? "Ví điện tử (Quét mã VietQR)"
      : "Thẻ ngân hàng (Quét mã VietQR)";

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vietqr-modal-title"
      data-testid="vietqr-payment-modal"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.brand}>SEPAY SANDBOX & VIETQR</span>
            <h2 id="vietqr-modal-title" className={styles.modalTitle}>
              Quét mã QR để Thanh toán
            </h2>
            <p className={styles.modalSubtitle}>Phương thức: {methodLabel}</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng cửa sổ thanh toán"
          >
            ✕
          </button>
        </div>

        <div className={styles.qrLayout}>
          <div className={styles.qrImageWrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payment.qrCodeUrl}
              alt={`Mã VietQR cho đơn hàng ${payment.paymentRef}`}
              className={styles.qrImage}
              data-testid="vietqr-image"
            />
            <span className={styles.qrSourceBadge}>
              {payment.bankInfo.source === "SEPAY_SANDBOX_API"
                ? "Tài khoản từ SePay Test Mode API v2"
                : "Chuẩn Napas 247 VietQR"}
            </span>
          </div>

          <div className={styles.bankDetailsBox}>
            <div className={styles.bankRow}>
              <span className={styles.bankLabel}>Ngân hàng thụ hưởng</span>
              <strong className={styles.bankValue}>
                {payment.bankInfo.bankId}
              </strong>
            </div>

            <div className={styles.bankRow}>
              <span className={styles.bankLabel}>Chủ tài khoản</span>
              <strong className={styles.bankValue}>
                {payment.bankInfo.accountName}
              </strong>
            </div>

            <div className={styles.bankRow}>
              <span className={styles.bankLabel}>Số tài khoản</span>
              <div className={styles.copyGroup}>
                <strong className={styles.bankValue}>
                  {payment.bankInfo.accountNo}
                </strong>
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={() =>
                    void handleCopy("account", payment.bankInfo.accountNo)
                  }
                >
                  {copiedField === "account" ? "Đã chép" : "Sao chép"}
                </button>
              </div>
            </div>

            <div className={styles.bankRow}>
              <span className={styles.bankLabel}>Số tiền thanh toán</span>
              <strong className={styles.bankAmount}>
                {payment.amount.toLocaleString("vi-VN")}đ
              </strong>
            </div>

            <div className={styles.bankRowHighlight}>
              <div>
                <span className={styles.bankLabel}>
                  Nội dung chuyển khoản (Bắt buộc)
                </span>
                <strong
                  className={styles.paymentRefCode}
                  data-testid="vietqr-payment-ref"
                >
                  {payment.paymentRef}
                </strong>
              </div>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => void handleCopy("ref", payment.paymentRef)}
              >
                {copiedField === "ref" ? "Đã chép" : "Sao chép"}
              </button>
            </div>

            <div className={styles.idempotencyMeta}>
              Idempotency-Key: <code>{payment.idempotencyKey}</code>
            </div>
          </div>
        </div>

        <div className={styles.pollingBar} data-testid="polling-indicator">
          <span className={styles.pulseDot} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div className={styles.pollingText}>{statusNote}</div>
            <div className={styles.pollingSub}>
              Lượt kiểm tra tự động (Polling): <strong>#{pollCount}</strong>
            </div>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={isPolling || isSimulating}
            onClick={() => void checkPaymentStatus(true)}
            data-testid="manual-poll-btn"
          >
            {isPolling ? "Đang kiểm tra..." : "Kiểm tra ngay"}
          </button>
        </div>

        <div className={styles.sandboxSimulatorBox}>
          <div className={styles.sandboxTitle}>
            Công cụ Mô phỏng SePay Sandbox Webhook (Test Mode / CI)
          </div>
          <p className={styles.sandboxDesc}>
            Nếu bạn không dùng ứng dụng ngân hàng quét mã, bạn có thể kích hoạt
            trực tiếp SePay Sandbox Webhook bên dưới để kiểm chứng luồng đối
            soát &amp; hoàn trả tồn kho:
          </p>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.simulateSuccessBtn}
              disabled={isSimulating}
              onClick={() => void handleSimulateWebhook("SUCCESS")}
              data-testid="simulate-webhook-success-btn"
            >
              {isSimulating
                ? "Đang gửi Webhook..."
                : "✓ Giả lập SePay Webhook Thành công"}
            </button>
            <button
              type="button"
              className={styles.simulateFailBtn}
              disabled={isSimulating}
              onClick={() => void handleSimulateWebhook("MOCK_FAIL")}
              data-testid="simulate-webhook-fail-btn"
            >
              ✕ Giả lập Thanh toán Lỗi (Rollback kho)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

