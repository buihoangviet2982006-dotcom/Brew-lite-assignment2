"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getMyOrder,
  getStoredAccessToken,
  saveCheckoutCart,
} from "../../../lib/order-api";
import {
  getOrCreateIdempotencyKey,
  initiatePayment,
} from "../../../lib/payment-api";
import { SIZE_EXTRA_PRICE_MAP, useCartStore } from "../../../store/cart.store";
import { VietQrPaymentModal } from "../../../components/checkout/VietQrPaymentModal";
import type { OrderDetailResponse, ProductSize } from "../../../types/order";
import type { PaymentResultResponse } from "../../../types/payment";
import styles from "../orders.module.css";

const statusSteps = [
  { value: "PENDING", label: "Chờ thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "PREPARING", label: "Đang chuẩn bị" },
  { value: "COMPLETED", label: "Hoàn thành" },
];

const statusLabels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Đang chuẩn bị",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  PAYMENT_FAILED: "Thanh toán thất bại",
};

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "PENDING":
      return `${styles.statusBadge} ${styles.statusPending}`;
    case "PAID":
      return `${styles.statusBadge} ${styles.statusPaid}`;
    case "PREPARING":
      return `${styles.statusBadge} ${styles.statusPreparing}`;
    case "COMPLETED":
      return `${styles.statusBadge} ${styles.statusCompleted}`;
    default:
      return `${styles.statusBadge} ${styles.statusFailed}`;
  }
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Không thể tải chi tiết đơn hàng.";
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId || "";

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingQr, setOpeningQr] = useState(false);
  const [activeQrPayment, setActiveQrPayment] =
    useState<PaymentResultResponse | null>(null);

  const addItemToCart = useCartStore((state) => state.addItem);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getStoredAccessToken();

    if (!token) {
      setError("Bạn cần đăng nhập để xem chi tiết đơn hàng.");
      setLoading(false);
      return;
    }

    try {
      const result = await getMyOrder(orderId, token);
      setOrder(result);
    } catch (err) {
      setError(getErrorMessage(err));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const handleOpenQrPayment = async () => {
    if (!order) return;
    const token = getStoredAccessToken();
    if (!token) {
      setError("Bạn cần đăng nhập để thanh toán đơn hàng.");
      return;
    }

    setOpeningQr(true);
    setError("");

    try {
      const idempotencyKey = getOrCreateIdempotencyKey(order.id, "WALLET");
      const paymentSession = await initiatePayment(
        {
          orderId: order.id,
          method: "WALLET",
          idempotencyKey,
        },
        token,
        idempotencyKey
      );
      setActiveQrPayment(paymentSession);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setOpeningQr(false);
    }
  };

  const handleReorder = () => {
    if (!order) return;
    for (const item of order.orderItems ?? []) {
      const size: ProductSize =
        item.size === "S" || item.size === "M" || item.size === "L"
          ? item.size
          : "M";
      const sizeExtraPrice = SIZE_EXTRA_PRICE_MAP[size] ?? 0;
      const toppingsPrice = (item.toppings ?? []).reduce(
        (sum, t) => sum + Number(t.price ?? 0),
        0
      );
      const fallbackBasePrice = Math.max(
        0,
        Math.round(item.lineTotal / Math.max(1, item.quantity)) -
          sizeExtraPrice -
          toppingsPrice
      );

      addItemToCart({
        productId: item.productId,
        name: item.product?.name ?? "Thức uống BrewLite",
        basePrice: Number(item.product?.price ?? fallbackBasePrice),
        imageUrl: item.product?.imageUrl,
        size,
        sizeExtraPrice,
        quantity: item.quantity,
        toppings: (item.toppings ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          price: Number(t.price),
        })),
      });
    }

    const updatedItems = useCartStore.getState().items;
    saveCheckoutCart(
      updatedItems.map((i) => ({
        key: i.key,
        productId: i.productId,
        name: i.name,
        basePrice: i.basePrice,
        imageUrl: i.imageUrl,
        size: i.size,
        sizeExtraPrice: i.sizeExtraPrice,
        quantity: i.quantity,
        toppings: i.toppings,
        note: i.note,
      }))
    );

    router.push("/cart");
  };

  const currentStep = statusSteps.findIndex(
    (step) => step.value === order?.status
  );

  return (
    <main className={styles.container} data-testid="order-detail-page">
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <Link href="/orders" className={styles.backLink}>
            ← Quay lại lịch sử đơn hàng
          </Link>

          <div className={styles.topActions}>
            <button
              type="button"
              onClick={() => void loadOrder()}
              disabled={loading}
              className={styles.refreshBtn}
            >
              ↻ Cập nhật trạng thái
            </button>
            <Link href="/menu" className={styles.secondaryBtn}>
              Thực đơn
            </Link>
          </div>
        </div>

        <header className={styles.headerBox}>
          <span className={styles.brand}>BREWLITE TRACKING</span>
          <h1 className={styles.title}>Chi tiết đơn hàng</h1>
        </header>

        {loading && (
          <section className={`${styles.card} ${styles.emptyBox}`}>
            <p className={styles.subtitle}>Đang tải thông tin đơn hàng...</p>
          </section>
        )}

        {!loading && error && (
          <section role="alert" className={styles.alertError}>
            <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{error}</p>
            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void loadOrder()}
              >
                Thử lại
              </button>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/orders/${orderId}`)}`}
                className={styles.primaryBtn}
              >
                Đi tới trang đăng nhập
              </Link>
            </div>
          </section>
        )}

        {!loading && !error && order && (
          <>
            <section className={styles.card}>
              <div className={styles.orderHeader}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
                    Đơn hàng #{order.orderId}
                  </h2>
                  <p className={styles.orderDateText}>
                    Ngày đặt: {new Date(order.createdAt).toLocaleString("vi-VN")}{" "}
                    • Cập nhật lần cuối:{" "}
                    {new Date(order.updatedAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                <strong className={getStatusBadgeClass(order.status)}>
                  {statusLabels[order.status] ?? order.status}
                </strong>
              </div>

              <div
                style={{
                  marginTop: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <p style={{ margin: 0, fontSize: "14px" }}>
                  Trạng thái:{" "}
                  <strong>{statusLabels[order.status] ?? order.status}</strong>
                </p>

                <div className={styles.actionGroup}>
                  {order.status === "PENDING" && (
                    <button
                      type="button"
                      className={styles.payQrBtn}
                      disabled={openingQr}
                      onClick={() => void handleOpenQrPayment()}
                      data-testid="detail-pay-qr-btn"
                    >
                      {openingQr
                        ? "Đang mở mã QR..."
                        : "Quét mã QR thanh toán ngay"}
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={handleReorder}
                  >
                    Mua lại đơn này
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>
                Tiến trình đơn hàng
              </h2>

              {order.status === "CANCELLED" ? (
                <p
                  style={{
                    marginTop: "12px",
                    color: "#b42318",
                    fontWeight: "bold",
                  }}
                >
                  Đơn hàng đã bị hủy.
                </p>
              ) : order.status === "PAYMENT_FAILED" ? (
                <p
                  style={{
                    marginTop: "12px",
                    color: "#b42318",
                    fontWeight: "bold",
                  }}
                >
                  Giao dịch thanh toán đơn hàng thất bại (Đã hoàn trả tồn kho).
                </p>
              ) : currentStep === -1 ? (
                <p style={{ marginTop: "12px" }}>
                  Trạng thái hiện tại: {order.status}
                </p>
              ) : (
                <ol className={styles.stepperList}>
                  {statusSteps.map((step, index) => {
                    const completed = index <= currentStep;
                    const isCurrent = index === currentStep;

                    return (
                      <li
                        key={step.value}
                        className={
                          isCurrent
                            ? styles.stepItemCurrent
                            : completed
                              ? styles.stepItemDone
                              : styles.stepItem
                        }
                      >
                        <span>{completed ? "✓" : "○"}</span>
                        <span>
                          {step.label}
                          {isCurrent ? " (Hiện tại)" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section className={styles.card}>
              <h2
                style={{
                  margin: "0 0 14px",
                  fontSize: "17px",
                  fontWeight: 800,
                }}
              >
                Sản phẩm trong đơn hàng
              </h2>

              <div className={styles.orderItemsPreview}>
                {order.orderItems.map((item) => (
                  <article key={item.id} className={styles.itemLine}>
                    <div className={styles.itemLeft}>
                      <div className={styles.itemIcon}>
                        {item.product?.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span aria-hidden="true">☕</span>
                        )}
                      </div>

                      <div>
                        <h3 className={styles.itemTitle}>
                          {item.product?.name ?? "Sản phẩm không còn tồn tại"}
                        </h3>
                        <p className={styles.itemSub}>
                          Kích thước: <strong>{item.size}</strong> • Số lượng:{" "}
                          <strong>{item.quantity}</strong>
                        </p>
                        {item.toppings.length > 0 && (
                          <p className={styles.itemSub}>
                            Topping:{" "}
                            {item.toppings.map((t) => t.name).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <strong className={styles.itemPrice}>
                      {item.lineTotal.toLocaleString("vi-VN")}đ
                    </strong>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <h2
                style={{
                  margin: "0 0 14px",
                  fontSize: "17px",
                  fontWeight: 800,
                }}
              >
                Tổng kết đơn hàng
              </h2>

              <div className={styles.summaryRow}>
                <span>Tạm tính</span>
                <strong>{order.subtotal.toLocaleString("vi-VN")}đ</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>Giảm giá</span>
                <strong style={{ color: "#15803d" }}>
                  {order.discountAmount > 0
                    ? `-${order.discountAmount.toLocaleString("vi-VN")}đ`
                    : "0đ"}
                </strong>
              </div>

              <div className={styles.summaryTotalRow}>
                <span>Tổng thanh toán: {order.total.toLocaleString("vi-VN")}đ</span>
                <strong className={styles.totalAmount}>
                  {order.total.toLocaleString("vi-VN")}đ
                </strong>
              </div>
            </section>
          </>
        )}

        {activeQrPayment && (
          <VietQrPaymentModal
            payment={activeQrPayment}
            token={getStoredAccessToken() || ""}
            onClose={() => setActiveQrPayment(null)}
            onPaymentSucceeded={() => {
              setActiveQrPayment(null);
              void loadOrder();
            }}
            onPaymentFailed={(msg) => {
              setActiveQrPayment(null);
              setError(msg);
              void loadOrder();
            }}
          />
        )}
      </div>
    </main>
  );
}
