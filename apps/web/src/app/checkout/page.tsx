"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  clearCheckoutCart,
  createOrder,
  getStoredAccessToken,
  loadCheckoutCart,
  saveCheckoutCart,
  type CreateOrderApiError,
} from "../../lib/order-api";
import {
  clearIdempotencyKey,
  getEnvVietQrBankConfig,
  getOrCreateIdempotencyKey,
  getVietQrBankConfig,
  initiatePayment,
} from "../../lib/payment-api";
import {
  SIZE_EXTRA_PRICE_MAP,
  useCartStore,
} from "../../store/cart.store";
import {
  QrCodeMatrixSvg,
  VietQrPaymentModal,
} from "../../components/checkout/VietQrPaymentModal";
import type {
  CheckoutCartItem,
  CreatedOrderResponse,
  PaymentMethod,
} from "../../types/order";
import type {
  PaymentApiError,
  PaymentResultResponse,
  VietQrBankInfo,
} from "../../types/payment";
import styles from "./checkout.module.css";

function formatBankDisplayName(bankId: string): string {
  const upper = (bankId || "MB").toUpperCase();
  if (upper === "MB" || upper === "MBBANK") {
    return "MB Bank (Ngân hàng Quân Đội)";
  }
  return `Ngân hàng ${bankId}`;
}

const KNOWN_PROMOTIONS: Record<
  string,
  { discountValue: number; minOrderAmount: number; label: string }
> = {
  WELCOME10: {
    discountValue: 10000,
    minOrderAmount: 40000,
    label: "Giảm 10.000đ cho đơn từ 40.000đ",
  },
  BREWLITE20: {
    discountValue: 20000,
    minOrderAmount: 80000,
    label: "Giảm 20.000đ cho đơn từ 80.000đ",
  },
  FREESHIP: {
    discountValue: 15000,
    minOrderAmount: 50000,
    label: "Giảm 15.000đ cho đơn từ 50.000đ",
  },
};

export default function CheckoutPage() {
  const [items, setItems] = useState<CheckoutCartItem[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [promotionCode, setPromotionCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLET");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [requireLogin, setRequireLogin] = useState(false);
  const [outOfStockIds, setOutOfStockIds] = useState<string[]>([]);
  const [createdOrder, setCreatedOrder] =
    useState<CreatedOrderResponse | null>(null);
  const [activeQrPayment, setActiveQrPayment] =
    useState<PaymentResultResponse | null>(null);
  const [completedPayment, setCompletedPayment] =
    useState<PaymentResultResponse | null>(null);
  const [copiedInlineField, setCopiedInlineField] = useState<string | null>(
    null
  );
  const [inlineQrImgError, setInlineQrImgError] = useState(false);
  const [bankConfig, setBankConfig] = useState<VietQrBankInfo>(() =>
    getEnvVietQrBankConfig()
  );

  useEffect(() => {
    setItems(loadCheckoutCart());
    const savedToken = getStoredAccessToken();
    setToken(savedToken);
    if (savedToken) {
      setRequireLogin(false);
    } else {
      setRequireLogin(true);
      setErrorMessage(
        "Bạn cần đăng nhập tài khoản để đặt đơn và thanh toán. Vui lòng đăng nhập hoặc đăng ký tài khoản mới."
      );
    }

    void getVietQrBankConfig().then((resolved) => {
      setBankConfig(resolved);
    });
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const sizeExtra =
        item.sizeExtraPrice ?? SIZE_EXTRA_PRICE_MAP[item.size] ?? 0;
      const toppingsPrice = item.toppings.reduce(
        (tSum, t) => tSum + t.price,
        0
      );
      return sum + (item.basePrice + sizeExtra + toppingsPrice) * item.quantity;
    }, 0);
  }, [items]);

  const normalizedPromoCode = promotionCode.trim().toUpperCase();
  const matchedPromo = normalizedPromoCode
    ? KNOWN_PROMOTIONS[normalizedPromoCode]
    : undefined;

  const estimatedDiscount = useMemo(() => {
    if (!matchedPromo) return 0;
    if (subtotal < matchedPromo.minOrderAmount) return 0;
    return Math.min(subtotal, matchedPromo.discountValue);
  }, [matchedPromo, subtotal]);

  const estimatedTotal = Math.max(0, subtotal - estimatedDiscount);

  const inlinePaymentRef = useMemo(() => {
    if (activeQrPayment?.paymentRef) return activeQrPayment.paymentRef;
    if (createdOrder?.orderId) {
      const cleaned = createdOrder.orderId
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 8);
      return `BREW${cleaned || "ORDER001"}`;
    }
    return "BREWCHECKOUT";
  }, [activeQrPayment, createdOrder]);

  const activeBankInfo = activeQrPayment?.bankInfo ?? bankConfig;

  const inlineVietQrUrl = useMemo(() => {
    const query = new URLSearchParams({
      amount: String(estimatedTotal),
      addInfo: inlinePaymentRef,
      accountName: activeBankInfo.accountName,
    });
    const tpl = activeBankInfo.template || "compact2";
    return `https://img.vietqr.io/image/${encodeURIComponent(
      activeBankInfo.bankId
    )}-${encodeURIComponent(activeBankInfo.accountNo)}-${encodeURIComponent(
      tpl
    )}.png?${query.toString()}`;
  }, [activeBankInfo, estimatedTotal, inlinePaymentRef]);

  const handleCopyInline = async (field: string, value: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
        setCopiedInlineField(field);
        setTimeout(() => setCopiedInlineField(null), 2000);
      }
    } catch {
      // Bỏ qua lỗi clipboard
    }
  };

  const updateItemQuantity = useCallback((key: string, delta: number) => {
    setItems((prev) => {
      const next = prev
        .map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0);
      saveCheckoutCart(next);
      return next;
    });
    setOutOfStockIds([]);
    setErrorMessage("");
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.key !== key);
      saveCheckoutCart(next);
      return next;
    });
    setOutOfStockIds([]);
    setErrorMessage("");
  }, []);

  const handlePaymentSucceeded = useCallback(
    (finalPayment: PaymentResultResponse) => {
      setActiveQrPayment(null);
      setCompletedPayment(finalPayment);
      useCartStore.getState().clearCart();
      clearCheckoutCart();
      setItems([]);
      setErrorMessage("");
    },
    []
  );

  const handlePaymentFailed = useCallback(
    (message: string) => {
      if (createdOrder) {
        clearIdempotencyKey(createdOrder.orderId, paymentMethod);
      }
      setActiveQrPayment(null);
      setCreatedOrder(null);
      setErrorMessage(message);
    },
    [createdOrder, paymentMethod]
  );

  const handlePlaceOrderAndPay = async () => {
    if ((items.length === 0 && !createdOrder) || submitting) return;

    setErrorMessage("");
    setRequireLogin(false);
    setOutOfStockIds([]);

    const currentToken = token || getStoredAccessToken();
    if (!currentToken) {
      setRequireLogin(true);
      setErrorMessage(
        "Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục đặt đơn."
      );
      return;
    }

    setToken(currentToken);

    try {
      setSubmitting(true);

      // Bước 1: Tạo đơn hàng ở trạng thái PENDING (nếu chưa có đơn chờ)
      let targetOrder = createdOrder;
      if (!targetOrder) {
        targetOrder = await createOrder(
          {
            items: items.map((item) => ({
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
              ...(item.toppings.length > 0
                ? { toppingIds: item.toppings.map((t) => t.id) }
                : {}),
            })),
            ...(promotionCode.trim()
              ? { promotionCode: promotionCode.trim().toUpperCase() }
              : {}),
          },
          currentToken
        );
        setCreatedOrder(targetOrder);
      }

      // Bước 2: Sinh Idempotency-Key và gọi POST /payments để mở mã QR thanh toán
      const idempotencyKey = getOrCreateIdempotencyKey(
        targetOrder.orderId,
        paymentMethod
      );

      const paymentRes = await initiatePayment(
        {
          orderId: targetOrder.orderId,
          method: paymentMethod,
          idempotencyKey,
        },
        currentToken,
        idempotencyKey
      );

      if (
        paymentRes.status === "SUCCEEDED" ||
        paymentRes.orderStatus === "PAID"
      ) {
        handlePaymentSucceeded(paymentRes);
      } else {
        setActiveQrPayment(paymentRes);
      }
    } catch (err) {
      const apiErr = err as CreateOrderApiError & PaymentApiError;

      if (apiErr.status === 401) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("accessToken");
        }
        setToken(null);
        setRequireLogin(true);
        setErrorMessage(
          "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục."
        );
      } else if (apiErr.status === 409) {
        setOutOfStockIds(apiErr.outOfStockProductIds ?? []);
        setErrorMessage(
          apiErr.message ||
            "Một số sản phẩm trong giỏ đã hết hàng hoặc không đủ số lượng. Vui lòng cập nhật lại giỏ hàng."
        );
      } else {
        // Lỗi thanh toán 400 / 504 -> đơn đã được rollback kho, reset createdOrder để khách thử lại
        if (createdOrder) {
          clearIdempotencyKey(createdOrder.orderId, paymentMethod);
        }
        setCreatedOrder(null);
        setErrorMessage(
          apiErr.message ||
            "Thanh toán không thành công. Giỏ hàng của bạn vẫn được giữ nguyên để thử lại."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        <Link href="/menu" className={styles.backLink}>
          ← Quay lại Thực đơn
        </Link>

        <header>
          <span className={styles.brand}>BREWLITE CHECKOUT & PAYMENT</span>
          <h1 className={styles.title}>Xác nhận &amp; Thanh toán Đơn hàng</h1>
          <p className={styles.subtitle}>
            Thanh toán không tiền mặt qua Ví/Thẻ kết hợp mã VietQR &amp; SePay
            Sandbox
          </p>
        </header>

        {errorMessage && (
          <div
            className={styles.alertError}
            role="alert"
            data-testid="checkout-error"
          >
            <div>{errorMessage}</div>
            {requireLogin && (
              <div className={styles.actionRow}>
                <Link
                  href="/login?redirect=/checkout"
                  className={styles.secondaryButton}
                  data-testid="checkout-login-link"
                >
                  Đi tới trang Đăng nhập
                </Link>
                <Link
                  href="/register?redirect=/checkout"
                  className={styles.secondaryButton}
                  data-testid="checkout-register-link"
                >
                  Đăng ký tài khoản mới
                </Link>
              </div>
            )}
          </div>
        )}

        {completedPayment ? (
          <section
            className={styles.alertSuccess}
            data-testid="payment-success-banner"
          >
            <h2 className={styles.cardTitle}>
              🎉 Thanh toán Đơn hàng Thành công!
            </h2>
            <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Mã đơn hàng: <strong>#{completedPayment.orderId}</strong>
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Mã tham chiếu giao dịch:{" "}
              <strong>{completedPayment.paymentRef}</strong>
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Trạng thái đơn:{" "}
              <strong data-testid="paid-order-status">
                {completedPayment.orderStatus}
              </strong>{" "}
              (Payment: <strong>{completedPayment.status}</strong>)
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Phương thức:{" "}
              <strong>
                {completedPayment.method === "WALLET"
                  ? "Ví điện tử (WALLET)"
                  : "Thẻ ngân hàng (CARD)"}
              </strong>
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "15px" }}>
              Tổng đã thanh toán:{" "}
              <strong>
                {completedPayment.amount.toLocaleString("vi-VN")}đ
              </strong>
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Điểm thưởng tích lũy:{" "}
              <strong>+{completedPayment.loyaltyPointsEarned} điểm</strong>
            </p>
            <p style={{ margin: "0 0 4px", fontSize: "12px", opacity: 0.85 }}>
              Idempotency-Key: <code>{completedPayment.idempotencyKey}</code>
              {completedPayment.idempotentReplayed
                ? " (Đã chặn xử lý trùng lặp Idempotency)"
                : ""}
            </p>
            
            <div className={styles.actionRow}>
              <Link
                href={`/orders/${encodeURIComponent(completedPayment.orderId)}`}
                className={styles.secondaryButton}
              >
                Xem chi tiết đơn hàng
              </Link>

              <Link href="/orders" className={styles.secondaryButton}>
                Lịch sử đơn hàng
              </Link>

              <Link href="/menu" className={styles.secondaryButton}>
                Tiếp tục chọn món mới
              </Link>
            </div>

          </section>
        ) : items.length === 0 ? (
          <section
            className={`${styles.card} ${styles.emptyBox}`}
            data-testid="checkout-empty"
          >
            <h2 className={styles.cardTitle}>Giỏ hàng của bạn đang trống</h2>
            <p className={styles.subtitle}>
              Vui lòng chọn ít nhất 1 thức uống từ thực đơn trước khi đặt đơn.
            </p>
            <div
              className={styles.actionRow}
              style={{ justifyContent: "center" }}
            >
              <Link href="/menu" className={styles.secondaryButton}>
                Xem thực đơn ngay
              </Link>
            </div>
            <div style={{ marginTop: "20px" }}>
              <button
                type="button"
                className={styles.primaryButton}
                disabled
                data-testid="submit-order-btn"
              >
                Tiến hành đặt đơn &amp; Thanh toán
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                Danh sách món đã chọn ({items.length} dòng)
              </h2>

              <div className={styles.itemList}>
                {items.map((item) => {
                  const isOutOfStock = outOfStockIds.includes(item.productId);
                  const sizeExtra =
                    item.sizeExtraPrice ?? SIZE_EXTRA_PRICE_MAP[item.size] ?? 0;
                  const toppingsSum = item.toppings.reduce(
                    (s, t) => s + t.price,
                    0
                  );
                  const lineTotal =
                    (item.basePrice + sizeExtra + toppingsSum) * item.quantity;

                  return (
                    <div
                      key={item.key}
                      className={`${styles.itemRow} ${isOutOfStock ? styles.itemOutOfStock : ""
                        }`}
                    >
                      <div className={styles.itemInfo}>
                        <h3 className={styles.itemName}>{item.name}</h3>
                        <p className={styles.itemMeta}>
                          Size: <strong>{item.size}</strong>
                          {item.toppings.length > 0 &&
                            ` • Topping: ${item.toppings
                              .map((t) => t.name)
                              .join(", ")}`}
                        </p>
                        {isOutOfStock && (
                          <span className={styles.outBadge}>
                            Hết hàng / Không đủ tồn kho
                          </span>
                        )}
                      </div>

                      <div className={styles.itemRight}>
                        <span className={styles.itemPrice}>
                          {lineTotal.toLocaleString("vi-VN")}đ
                        </span>
                        <div className={styles.qtyControls}>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            aria-label="Giảm số lượng"
                            onClick={() => updateItemQuantity(item.key, -1)}
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            aria-label="Tăng số lượng"
                            onClick={() => updateItemQuantity(item.key, 1)}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => removeItem(item.key)}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Mã khuyến mãi (Voucher)</h2>
              <div className={styles.promoRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nhập mã ưu đãi (VD: WELCOME10, BREWLITE20, FREESHIP)"
                  value={promotionCode}
                  onChange={(e) => setPromotionCode(e.target.value)}
                />
                {promotionCode && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setPromotionCode("")}
                  >
                    Gỡ mã
                  </button>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "10px",
                }}
              >
                {Object.entries(KNOWN_PROMOTIONS).map(([code, info]) => {
                  const isSelected = normalizedPromoCode === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() =>
                        setPromotionCode(isSelected ? "" : code)
                      }
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        border: isSelected
                          ? "1.5px solid #75452f"
                          : "1px dashed #c9b3a3",
                        background: isSelected ? "#f6ede6" : "#faf7f2",
                        color: "#75452f",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🏷️ {code} ({info.label})
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.card} data-testid="checkout-payment-section">
              <h2 className={styles.cardTitle}>
                Phương thức thanh toán &amp; Mã QR Chuyển khoản
              </h2>
              <div className={styles.methodGrid}>
                <button
                  type="button"
                  data-testid="method-wallet-btn"
                  className={
                    paymentMethod === "WALLET"
                      ? styles.methodActive
                      : styles.methodOption
                  }
                  onClick={() => setPaymentMethod("WALLET")}
                >
                  <div>
                    <div>Ví điện tử (WALLET)</div>
                    <span className={styles.methodSub}>
                      Quét mã QR bằng MoMo, ZaloPay, VNPay, Viettel Money
                    </span>
                  </div>
                  <span>{paymentMethod === "WALLET" ? "●" : "○"}</span>
                </button>
                <button
                  type="button"
                  data-testid="method-card-btn"
                  className={
                    paymentMethod === "CARD"
                      ? styles.methodActive
                      : styles.methodOption
                  }
                  onClick={() => setPaymentMethod("CARD")}
                >
                  <div>
                    <div>Thẻ / Ngân hàng (CARD)</div>
                    <span className={styles.methodSub}>
                      Quét mã chuyển khoản nhanh Napas 247 VietQR
                    </span>
                  </div>
                  <span>{paymentMethod === "CARD" ? "●" : "○"}</span>
                </button>
              </div>

              {/* Khung hiển thị trực tiếp Mã QR chuyển khoản ngay trên trang Thanh toán */}
              <div
                className={styles.qrLayout}
                data-testid="inline-qr-transfer-box"
                style={{
                  marginTop: "18px",
                  paddingTop: "16px",
                  borderTop: "1px dashed #e5d9cf",
                }}
              >
                <div className={styles.qrImageWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inlineVietQrUrl}
                    alt={`Mã QR chuyển khoản ${inlinePaymentRef}`}
                    className={styles.qrImage}
                    data-testid="checkout-inline-qr-image"
                    onError={() => setInlineQrImgError(true)}
                    style={{ display: inlineQrImgError ? "none" : "block" }}
                  />
                  {inlineQrImgError && (
                    <QrCodeMatrixSvg
                      payload={`VIETQR|${activeBankInfo.bankId}|${activeBankInfo.accountNo}|${estimatedTotal}|${inlinePaymentRef}`}
                      size={188}
                    />
                  )}
                  <span className={styles.qrSourceBadge}>
                    {paymentMethod === "WALLET"
                      ? "Quét bằng Ví điện tử / App Ngân hàng"
                      : "Chuẩn Napas 247 VietQR"}
                  </span>
                </div>

                <div className={styles.bankDetailsBox}>
                  <div className={styles.bankRow}>
                    <span className={styles.bankLabel}>Ngân hàng thụ hưởng</span>
                    <strong className={styles.bankValue}>
                      {formatBankDisplayName(activeBankInfo.bankId)}
                    </strong>
                  </div>

                  <div className={styles.bankRow}>
                    <span className={styles.bankLabel}>Chủ tài khoản</span>
                    <strong className={styles.bankValue} data-testid="inline-qr-account-name">
                      {activeBankInfo.accountName}
                    </strong>
                  </div>

                  <div className={styles.bankRow}>
                    <span className={styles.bankLabel}>Số tài khoản nhận</span>
                    <div className={styles.copyGroup}>
                      <strong className={styles.bankValue} data-testid="inline-qr-account-no">
                        {activeBankInfo.accountNo}
                      </strong>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() =>
                          void handleCopyInline(
                            "account",
                            activeBankInfo.accountNo
                          )
                        }
                      >
                        {copiedInlineField === "account"
                          ? "Đã chép"
                          : "Sao chép"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.bankRow}>
                    <span className={styles.bankLabel}>Số tiền chuyển khoản</span>
                    <strong className={styles.bankAmount}>
                      {estimatedTotal.toLocaleString("vi-VN")}đ
                    </strong>
                  </div>

                  <div className={styles.bankRowHighlight}>
                    <div>
                      <span className={styles.bankLabel}>
                        Nội dung chuyển khoản
                      </span>
                      <strong className={styles.paymentRefCode}>
                        {inlinePaymentRef}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() =>
                        void handleCopyInline("ref", inlinePaymentRef)
                      }
                    >
                      {copiedInlineField === "ref" ? "Đã chép" : "Sao chép"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Tóm tắt thanh toán</h2>
              <div className={styles.summaryRow}>
                <span>Tạm tính ({items.length} món)</span>
                <strong>{subtotal.toLocaleString("vi-VN")}đ</strong>
              </div>
              {normalizedPromoCode && (
                <div className={styles.summaryRow}>
                  <span>
                    Mã khuyến mãi ({normalizedPromoCode})
                  </span>
                  <strong style={{ color: "#15803d" }}>
                    {estimatedDiscount > 0
                      ? `-${estimatedDiscount.toLocaleString("vi-VN")}đ`
                      : "Kiểm tra khi tạo đơn"}
                  </strong>
                </div>
              )}
              <div className={styles.summaryTotal}>
                <span>Tổng cộng thanh toán</span>
                <span>{estimatedTotal.toLocaleString("vi-VN")}đ</span>
              </div>

              <div style={{ marginTop: "18px" }}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={submitting || items.length === 0}
                  onClick={() => void handlePlaceOrderAndPay()}
                  data-testid="submit-order-btn"
                >
                  {submitting
                    ? "Đang khởi tạo đơn & mã thanh toán..."
                    : "Tiến hành đặt đơn & Thanh toán ngay"}
                </button>
              </div>
            </section>
          </>
        )}

        {activeQrPayment && (
          <VietQrPaymentModal
            payment={activeQrPayment}
            token={token || getStoredAccessToken() || ""}
            onPaymentSucceeded={handlePaymentSucceeded}
            onPaymentFailed={handlePaymentFailed}
            onClose={() => setActiveQrPayment(null)}
          />
        )}
      </div>
    </main>
  );
}

