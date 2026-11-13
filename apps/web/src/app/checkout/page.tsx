"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getProducts } from "../../lib/product-api";
import {
  createOrder,
  getStoredAccessToken,
  loadCheckoutCart,
  saveCheckoutCart,
  type CreateOrderApiError,
} from "../../lib/order-api";
import type {
  CheckoutCartItem,
  CreatedOrderResponse,
  PaymentMethod,
} from "../../types/order";
import styles from "./checkout.module.css";

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
  const [devTokenInput, setDevTokenInput] = useState("");

  useEffect(() => {
    setItems(loadCheckoutCart());
    const savedToken = getStoredAccessToken();
    setToken(savedToken);
    if (savedToken) {
      setDevTokenInput(savedToken);
    }
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const toppingsPrice = item.toppings.reduce(
        (tSum, t) => tSum + t.price,
        0
      );
      return sum + (item.basePrice + toppingsPrice) * item.quantity;
    }, 0);
  }, [items]);

  const updateItemQuantity = useCallback(
    (key: string, delta: number) => {
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
    },
    []
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.key !== key);
      saveCheckoutCart(next);
      return next;
    });
    setOutOfStockIds([]);
    setErrorMessage("");
  }, []);

  const handlePlaceOrder = async () => {
    if (items.length === 0 || submitting) return;

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

    try {
      setSubmitting(true);

      const response = await createOrder(
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

      setCreatedOrder(response);

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "brewlite_pending_order",
          JSON.stringify({
            orderId: response.orderId,
            total: response.total,
            method: paymentMethod,
          })
        );
      }
    } catch (err) {
      const apiErr = err as CreateOrderApiError;

      if (apiErr.status === 401) {
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
        setErrorMessage(
          apiErr.message || "Không thể tạo đơn hàng. Vui lòng kiểm tra lại."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSampleCart = async () => {
    try {
      setErrorMessage("");
      const products = await getProducts();
      const available = products.filter((p) => p.isAvailable).slice(0, 2);
      if (available.length === 0) {
        setErrorMessage("Không tìm thấy sản phẩm còn hàng từ API GET /products.");
        return;
      }
      const sample: CheckoutCartItem[] = available.map((p, idx) => ({
        key: `${p.id}-M-${idx}`,
        productId: p.id,
        name: p.name,
        basePrice: p.basePrice,
        imageUrl: p.imageUrl,
        size: idx === 0 ? "M" : "L",
        quantity: 1,
        toppings: [],
      }));
      saveCheckoutCart(sample);
      setItems(sample);
      setCreatedOrder(null);
    } catch {
      setErrorMessage(
        "Không thể tải sản phẩm mẫu. Hãy đảm bảo Backend đang chạy ở cổng 4000."
      );
    }
  };

  const handleSaveDevToken = () => {
    const trimmed = devTokenInput.trim();
    if (!trimmed || typeof window === "undefined") return;
    window.localStorage.setItem("accessToken", trimmed);
    setToken(trimmed);
    setRequireLogin(false);
    setErrorMessage("");
  };

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        <Link href="/menu" className={styles.backLink}>
          ← Quay lại Thực đơn
        </Link>

        <header>
          <span className={styles.brand}>BREWLITE CHECKOUT</span>
          <h1 className={styles.title}>Xác nhận & Đặt đơn hàng</h1>
          <p className={styles.subtitle}>
            Kiểm tra lại danh sách đồ uống và hoàn tất tạo đơn nhận tại quầy
          </p>
        </header>

        {errorMessage && (
          <div className={styles.alertError} role="alert" data-testid="checkout-error">
            <div>{errorMessage}</div>
            {requireLogin && (
              <div className={styles.actionRow}>
                <Link
                  href="/login?redirect=/checkout"
                  className={styles.secondaryButton}
                >
                  Đi tới trang Đăng nhập
                </Link>
              </div>
            )}
          </div>
        )}

        {createdOrder ? (
          <section className={styles.alertSuccess} data-testid="checkout-success">
            <h2 className={styles.cardTitle}>
              Đã khởi tạo đơn hàng thành công!
            </h2>
            <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Mã đơn hàng: <strong>#{createdOrder.orderId}</strong>
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Trạng thái: <strong>{createdOrder.status}</strong> (Đã khóa tồn kho)
            </p>
            <p style={{ margin: "0 0 4px", fontSize: "15px" }}>
              Tổng thanh toán:{" "}
              <strong>{createdOrder.total.toLocaleString("vi-VN")}đ</strong> (
              {paymentMethod === "WALLET" ? "Ví điện tử" : "Thẻ ngân hàng"})
            </p>

            <div className={styles.actionRow}>
              <Link
                href={`/orders/${createdOrder.orderId}?method=${paymentMethod}`}
                className={styles.secondaryButton}
              >
                Tiếp tục Thanh toán / Theo dõi đơn
              </Link>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setCreatedOrder(null)}
              >
                Quay lại đơn vừa tạo
              </button>
            </div>
          </section>
        ) : items.length === 0 ? (
          <section className={`${styles.card} ${styles.emptyBox}`} data-testid="checkout-empty">
            <h2 className={styles.cardTitle}>Giỏ hàng của bạn đang trống</h2>
            <p className={styles.subtitle}>
              Vui lòng chọn ít nhất 1 thức uống từ thực đơn trước khi đặt đơn.
            </p>
            <div className={styles.actionRow} style={{ justifyContent: "center" }}>
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
                Tiến hành đặt đơn
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
                  const toppingsSum = item.toppings.reduce(
                    (s, t) => s + t.price,
                    0
                  );
                  const lineTotal =
                    (item.basePrice + toppingsSum) * item.quantity;

                  return (
                    <div
                      key={item.key}
                      className={`${styles.itemRow} ${
                        isOutOfStock ? styles.itemOutOfStock : ""
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
              <h2 className={styles.cardTitle}>Mã khuyến mãi (Tùy chọn)</h2>
              <div className={styles.promoRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nhập mã ưu đãi (VD: WELCOME10, BREWLITE20)"
                  value={promotionCode}
                  onChange={(e) => setPromotionCode(e.target.value)}
                />
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Phương thức thanh toán</h2>
              <div className={styles.methodGrid}>
                <button
                  type="button"
                  className={
                    paymentMethod === "WALLET"
                      ? styles.methodActive
                      : styles.methodOption
                  }
                  onClick={() => setPaymentMethod("WALLET")}
                >
                  <span>Ví điện tử (MoMo / BrewLite Pay)</span>
                  <span>{paymentMethod === "WALLET" ? "✓" : ""}</span>
                </button>

                <button
                  type="button"
                  className={
                    paymentMethod === "CARD"
                      ? styles.methodActive
                      : styles.methodOption
                  }
                  onClick={() => setPaymentMethod("CARD")}
                >
                  <span>Thẻ ngân hàng (ATM / Visa)</span>
                  <span>{paymentMethod === "CARD" ? "✓" : ""}</span>
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Tóm tắt thanh toán</h2>
              <div className={styles.summaryRow}>
                <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} ly)</span>
                <span>{subtotal.toLocaleString("vi-VN")}đ</span>
              </div>
              {promotionCode.trim() && (
                <div className={styles.summaryRow}>
                  <span>Mã khuyến mãi áp dụng</span>
                  <strong>{promotionCode.trim().toUpperCase()}</strong>
                </div>
              )}
              <div className={styles.summaryTotal}>
                <span>Tổng cộng tạm tính</span>
                <span>{subtotal.toLocaleString("vi-VN")}đ</span>
              </div>

              <div style={{ marginTop: "18px" }}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={items.length === 0 || submitting}
                  onClick={() => void handlePlaceOrder()}
                  data-testid="submit-order-btn"
                >
                  {submitting
                    ? "Đang kiểm tra tồn kho & tạo đơn..."
                    : "Tiến hành đặt đơn"}
                </button>
              </div>
            </section>
          </>
        )}

        {process.env.NODE_ENV === "development" && (
          <aside className={styles.devBox}>
            <strong>Công cụ Test độc lập (Chỉ hiện ở môi trường Dev):</strong>
            <p style={{ margin: "6px 0 10px" }}>
              Dùng để test tạo đơn ngay khi nhánh Giỏ hàng & Đăng nhập của đồng
              đội chưa gộp vào develop.
            </p>
            <div className={styles.promoRow} style={{ marginBottom: "10px" }}>
              <input
                type="text"
                className={styles.input}
                placeholder="Dán JWT Token kiểm thử vào đây..."
                value={devTokenInput}
                onChange={(e) => setDevTokenInput(e.target.value)}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleSaveDevToken}
              >
                Lưu Token
              </button>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleLoadSampleCart()}
            >
              Nạp 2 món mẫu từ API GET /products
            </button>
          </aside>
        )}
      </div>
    </main>
  );
}