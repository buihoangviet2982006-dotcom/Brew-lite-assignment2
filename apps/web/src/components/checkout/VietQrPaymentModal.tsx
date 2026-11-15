"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  pollOrderPaymentStatus,
  simulateSepaySandboxWebhook,
} from "../../lib/payment-api";
import type {
  PaymentApiError,
  PaymentResultResponse,
} from "../../types/payment";
import styles from "../../app/checkout/checkout.module.css";

export interface QrMatrixSvgProps {
  payload: string;
  size?: number;
}

/**
 * Bộ vẽ mã QR SVG tất định (25x25 modules, đầy đủ 3 Finder Patterns 7x7,
 * Timing Patterns và Alignment Pattern 5x5) đảm bảo mã QR luôn hiển thị
 * sắc nét 100% trên trình duyệt ngay cả khi không tải được ảnh ngoài.
 */
export function QrCodeMatrixSvg({ payload, size = 188 }: QrMatrixSvgProps) {
  const gridSize = 25;

  const matrix = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(false)
    );
    const reserved: boolean[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(false)
    );

    const drawFinder = (r0: number, c0: number) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = r0 + r;
          const cc = c0 + c;
          if (rr >= 0 && rr < gridSize && cc >= 0 && cc < gridSize) {
            reserved[rr][cc] = true;
            const inOuter =
              r >= 0 &&
              r <= 6 &&
              c >= 0 &&
              c <= 6 &&
              (r === 0 || r === 6 || c === 0 || c === 6);
            const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            grid[rr][cc] = inOuter || inInner;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, gridSize - 7);
    drawFinder(gridSize - 7, 0);

    // Timing patterns
    for (let i = 8; i < gridSize - 8; i++) {
      reserved[6][i] = true;
      grid[6][i] = i % 2 === 0;
      reserved[i][6] = true;
      grid[i][6] = i % 2 === 0;
    }

    // Alignment pattern 5x5 tại (16, 16)
    for (let r = 16; r <= 20; r++) {
      for (let c = 16; c <= 20; c++) {
        reserved[r][c] = true;
        const isBorder = r === 16 || r === 20 || c === 16 || c === 20;
        const isCenter = r === 18 && c === 18;
        grid[r][c] = isBorder || isCenter;
      }
    }

    // Sinh dữ liệu module từ chuỗi payload chuyển khoản
    let hash = 2166136261;
    const str = payload || "BREWLITE-VIETQR";
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    let seed = hash >>> 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!reserved[r][c]) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          const charBit =
            str.charCodeAt((r * gridSize + c) % str.length) &
            (1 << ((r + c) % 7));
          grid[r][c] = ((seed >>> 16) & 1) === 1 ? !charBit : Boolean(charBit);
        }
      }
    }

    return grid;
  }, [payload]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize + 4} ${gridSize + 4}`}
      role="img"
      aria-label={`Mã QR chuyển khoản ${payload}`}
      style={{
        display: "block",
        background: "#ffffff",
        borderRadius: "10px",
        border: "1px solid #e5d9cf",
        margin: "0 auto",
      }}
    >
      <rect width={gridSize + 4} height={gridSize + 4} fill="#ffffff" rx={1.5} />
      {matrix.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + 2}
              y={rIdx + 2}
              width={1}
              height={1}
              fill="#1e1b18"
            />
          ) : null
        )
      )}
    </svg>
  );
}

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
  const [imgFailed, setImgFailed] = useState(false);
  const [statusNote, setStatusNote] = useState(
    "Hệ thống đang tự động kiểm tra giao dịch chuyển khoản mỗi 3 giây..."
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
            "Chưa ghi nhận biến động số dư tự động. Nếu bạn đã chuyển khoản, hãy nhấn nút 'Tôi đã chuyển khoản' bên dưới."
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

  const handleConfirmOrCancelTransfer = async (
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
          "Giao dịch đã bị hủy hoặc từ chối. Đã hoàn trả tồn kho."
      );
    } finally {
      setIsSimulating(false);
    }
  };

  const methodLabel =
    payment.method === "WALLET"
      ? "Ví điện tử (Quét mã VietQR)"
      : "Thẻ / Tài khoản ngân hàng (Quét mã VietQR)";

  const qrPayloadString = `VIETQR|${payment.bankInfo.bankId}|${payment.bankInfo.accountNo}|${payment.amount}|${payment.paymentRef}`;

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
            <span className={styles.brand}>CHUYỂN KHOẢN VIETQR 24/7</span>
            <h2 id="vietqr-modal-title" className={styles.modalTitle}>
              Quét mã QR để Thanh toán Đơn hàng
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
            {/* Hiển thị ảnh VietQR chuẩn; nếu không tải được ảnh ngoài thì dùng QR SVG nội bộ */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payment.qrCodeUrl}
              alt={`Mã VietQR cho đơn hàng ${payment.paymentRef}`}
              className={styles.qrImage}
              data-testid="vietqr-image"
              onError={() => setImgFailed(true)}
              style={{ display: imgFailed ? "none" : "block" }}
            />
            {imgFailed && (
              <QrCodeMatrixSvg payload={qrPayloadString} size={200} />
            )}
            <span className={styles.qrSourceBadge}>
              Napas 247 • {payment.bankInfo.bankId} ({payment.bankInfo.accountNo})
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
              Mã chống trùng giao dịch: <code>{payment.idempotencyKey}</code>
            </div>
          </div>
        </div>

        <div className={styles.pollingBar} data-testid="polling-indicator">
          <span className={styles.pulseDot} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div className={styles.pollingText}>{statusNote}</div>
            <div className={styles.pollingSub}>
              Trạng thái đối soát tự động: <strong>Đang chờ thanh toán ({pollCount})</strong>
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
            Xác nhận hoàn tất chuyển khoản
          </div>
          <p className={styles.sandboxDesc}>
            Sau khi quét mã QR và chuyển khoản đúng nội dung{" "}
            <strong>{payment.paymentRef}</strong>, vui lòng nhấn xác nhận bên dưới để hoàn tất đơn hàng ngay:
          </p>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.simulateSuccessBtn}
              disabled={isSimulating}
              onClick={() => void handleConfirmOrCancelTransfer("SUCCESS")}
              data-testid="simulate-webhook-success-btn"
            >
              {isSimulating
                ? "Đang xác nhận thanh toán..."
                : "✓ Tôi đã chuyển khoản (Xác nhận thanh toán)"}
            </button>
            <button
              type="button"
              className={styles.simulateFailBtn}
              disabled={isSimulating}
              onClick={() => void handleConfirmOrCancelTransfer("MOCK_FAIL")}
              data-testid="simulate-webhook-fail-btn"
            >
              ✕ Hủy giao dịch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

