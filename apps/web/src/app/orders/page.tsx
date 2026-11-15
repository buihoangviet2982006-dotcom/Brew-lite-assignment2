"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMyOrders,
  getStoredAccessToken,
  saveCheckoutCart,
} from "../../lib/order-api";
import {
  getOrCreateIdempotencyKey,
  initiatePayment,
} from "../../lib/payment-api";
import { SIZE_EXTRA_PRICE_MAP, useCartStore } from "../../store/cart.store";
import { VietQrPaymentModal } from "../../components/checkout/VietQrPaymentModal";
import type { OrderHistoryItem, ProductSize } from "../../types/order";
import type { PaymentResultResponse } from "../../types/payment";
import styles from "./orders.module.css";

const statusLabels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Đang chuẩn bị",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  PAYMENT_FAILED: "Thanh toán thất bại",
};

type FilterTabKey =
  | "ALL"
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "COMPLETED"
  | "FAILED_OR_CANCELLED";

const FILTER_TABS: Array<{ key: FilterTabKey; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ thanh toán" },
  { key: "PAID", label: "Đã thanh toán" },
  { key: "PREPARING", label: "Đang chuẩn bị" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "FAILED_OR_CANCELLED", label: "Đã hủy / Thất bại" },
];

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

  return "Không thể tải lịch sử đơn hàng. Vui lòng thử lại.";
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTabKey>("ALL");
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [activeQrPayment, setActiveQrPayment] =
    useState<PaymentResultResponse | null>(null);

  const addItemToCart = useCartStore((state) => state.addItem);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getStoredAccessToken();

    if (!token) {
      setError("Bạn cần đăng nhập để xem lịch sử đơn hàng.");
      setLoading(false);
      return;
    }

    try {
      const result = await getMyOrders(token);
      setOrders(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "ALL") return orders;
    if (activeFilter === "FAILED_OR_CANCELLED") {
      return orders.filter(
        (o) => o.status === "CANCELLED" || o.status === "PAYMENT_FAILED"
      );
    }
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  const countByTab = useMemo(() => {
    const counts: Record<FilterTabKey, number> = {
      ALL: orders.length,
      PENDING: 0,
      PAID: 0,
      PREPARING: 0,
      COMPLETED: 0,
      FAILED_OR_CANCELLED: 0,
    };
    for (const o of orders) {
      if (o.status === "PENDING") counts.PENDING += 1;
      else if (o.status === "PAID") counts.PAID += 1;
      else if (o.status === "PREPARING") counts.PREPARING += 1;
      else if (o.status === "COMPLETED") counts.COMPLETED += 1;
      else if (o.status === "CANCELLED" || o.status === "PAYMENT_FAILED") {
        counts.FAILED_OR_CANCELLED += 1;
      }
    }
    return counts;
  }, [orders]);

  const handleOpenQrForPendingOrder = async (order: OrderHistoryItem) => {
    const token = getStoredAccessToken();
    if (!token) {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    setPayingOrderId(order.id);
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
      setPayingOrderId(null);
    }
  };

  const handleReorder = (order: OrderHistoryItem) => {
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

  return (
    <main className={styles.container} data-testid="orders-history-page">
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <Link href="/menu" className={styles.backLink}>
            ← Quay lại thực đơn
          </Link>

          <div className={styles.topActions}>
            <button
              type="button"
              onClick={() => void loadOrders()}
              disabled={loading}
              className={styles.refreshBtn}
              data-testid="refresh-orders-btn"
            >
              {loading ? "Đang tải..." : "↻ Làm mới"}
            </button>

            <Link href="/cart" className={styles.cartShortcut}>
              🛒 Giỏ hàng
            </Link>
          </div>
        </div>

        <header className={styles.headerBox}>
          <span className={styles.brand}>BREWLITE ORDERS</span>
          <h1 className={styles.title}>Lịch sử đơn hàng</h1>
          <p className={styles.subtitle}>
            Theo dõi trạng thái pha chế, thanh toán mã QR và đặt lại các món yêu
            thích tại BrewLite.
          </p>
        </header>

        {!loading && !error && orders.length > 0 && (
          <nav
            className={styles.filterBar}
            aria-label="Lọc đơn hàng theo trạng thái"
            data-testid="orders-filter-bar"
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={
                    isActive ? styles.filterTabActive : styles.filterTab
                  }
                  data-testid={`filter-tab-${tab.key}`}
                >
                  <span>{tab.label}</span>
                  <span className={styles.filterCount}>
                    {countByTab[tab.key]}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {loading && (
          <section className={`${styles.card} ${styles.emptyBox}`}>
            <p className={styles.subtitle}>Đang tải lịch sử đơn hàng...</p>
          </section>
        )}

        {!loading && error && (
          <section role="alert" className={styles.alertError}>
            <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{error}</p>
            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void loadOrders()}
              >
                Thử lại
              </button>
              <Link href="/login?redirect=/orders" className={styles.primaryBtn}>
                Đi tới trang đăng nhập
              </Link>
            </div>
          </section>
        )}

        {!loading && !error && orders.length === 0 && (
          <section
            className={`${styles.card} ${styles.emptyBox}`}
            data-testid="orders-empty"
          >
            <div className={styles.emptyIcon} aria-hidden="true">
              ☕
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "20px" }}>
              Bạn chưa có đơn hàng nào
            </h2>
            <p className={styles.subtitle} style={{ marginBottom: "18px" }}>
              Hãy chọn món yêu thích trong thực đơn của BrewLite.
            </p>
            <Link href="/menu" className={styles.primaryBtn}>
              Khám phá thực đơn
            </Link>
          </section>
        )}

        {!loading &&
          !error &&
          orders.length > 0 &&
          filteredOrders.length === 0 && (
            <section className={`${styles.card} ${styles.emptyBox}`}>
              <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>
                Không có đơn hàng nào ở trạng thái này
              </h2>
              <p className={styles.subtitle} style={{ marginBottom: "14px" }}>
                Hãy chọn tab &ldquo;Tất cả&rdquo; để xem toàn bộ đơn hàng đã đặt.
              </p>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setActiveFilter("ALL")}
              >
                Xem tất cả đơn hàng
              </button>
            </section>
          )}

        {!loading &&
          !error &&
          filteredOrders.map((order) => {
            const totalItemsCount =
              order.itemCount ??
              (order.orderItems ?? []).reduce(
                (sum, item) => sum + item.quantity,
                0
              );

            return (
              <article
                key={order.id}
                className={styles.orderCard}
                data-testid={`order-card-${order.id}`}
              >
                <div className={styles.orderHeader}>
                  <div>
                    <strong className={styles.orderIdText}>
                      Đơn hàng #{order.orderId}
                    </strong>
                    <span className={styles.orderDateText}>
                      Ngày đặt:{" "}
                      {new Date(order.createdAt).toLocaleString("vi-VN")} • Số
                      lượng sản phẩm: {totalItemsCount} ly
                    </span>
                  </div>

                  <strong
                    className={getStatusBadgeClass(order.status)}
                    data-testid={`order-status-${order.id}`}
                  >
                    {statusLabels[order.status] ?? order.status}
                  </strong>
                </div>

                {/* Danh sách thức uống trong đơn */}
                {Array.isArray(order.orderItems) &&
                  order.orderItems.length > 0 && (
                    <div className={styles.orderItemsPreview}>
                      {order.orderItems.map((item) => (
                        <div key={item.id} className={styles.itemLine}>
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
                                {item.quantity}x{" "}
                                {item.product?.name ??
                                  "Thức uống BrewLite"}
                              </h3>
                              <p className={styles.itemSub}>
                                Size <strong>{item.size}</strong>
                                {Array.isArray(item.toppings) &&
                                  item.toppings.length > 0 &&
                                  ` • Topping: ${item.toppings
                                    .map((t) => t.name)
                                    .join(", ")}`}
                              </p>
                            </div>
                          </div>

                          <span className={styles.itemPrice}>
                            {Number(item.lineTotal).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                <div className={styles.orderFooter}>
                  <div className={styles.priceBreakdown}>
                    {order.discountAmount > 0 && (
                      <span className={styles.metaSummary}>
                        Tạm tính: {order.subtotal.toLocaleString("vi-VN")}đ •
                        Giảm giá: -{order.discountAmount.toLocaleString("vi-VN")}
                        đ
                      </span>
                    )}
                    <div className={styles.totalLabel}>
                      Tổng tiền:{" "}
                      <strong className={styles.totalAmount}>
                        {order.total.toLocaleString("vi-VN")}đ
                      </strong>
                    </div>
                  </div>

                  <div className={styles.actionGroup}>
                    {order.status === "PENDING" && (
                      <button
                        type="button"
                        className={styles.payQrBtn}
                        disabled={payingOrderId === order.id}
                        onClick={() => void handleOpenQrForPendingOrder(order)}
                        data-testid={`pay-qr-order-${order.id}`}
                      >
                        {payingOrderId === order.id
                          ? "Đang tạo QR..."
                          : "Quét mã QR thanh toán"}
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => handleReorder(order)}
                      data-testid={`reorder-btn-${order.id}`}
                    >
                      Mua lại đơn này
                    </button>

                    <Link
                      href={`/orders/${encodeURIComponent(order.id)}`}
                      className={styles.primaryBtn}
                      data-testid={`view-order-detail-${order.id}`}
                    >
                      Xem chi tiết đơn hàng
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}

        {activeQrPayment && (
          <VietQrPaymentModal
            payment={activeQrPayment}
            token={getStoredAccessToken() || ""}
            onClose={() => setActiveQrPayment(null)}
            onPaymentSuccess={() => {
              setActiveQrPayment(null);
              void loadOrders();
            }}
            onPaymentFailed={(msg) => {
              setActiveQrPayment(null);
              setError(msg);
              void loadOrders();
            }}
          />
        )}
      </div>
    </main>
  );
}
