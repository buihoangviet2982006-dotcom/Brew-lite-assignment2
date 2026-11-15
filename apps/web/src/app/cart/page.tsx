"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  calculateCartItemLineTotal,
  calculateCartItemUnitPrice,
  calculateCartSubtotal,
  calculateCartTotalCount,
  useCartStore,
} from "../../store/cart.store";
import styles from "./cart.module.css";

export default function CartPage() {
  const [hydrated, setHydrated] = useState(false);

  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const visibleItems = hydrated ? items : [];
  const totalCount = calculateCartTotalCount(visibleItems);
  const subtotal = calculateCartSubtotal(visibleItems);

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <Link href="/menu" className={styles.backLink}>
            ← Tiếp tục chọn món
          </Link>

          {visibleItems.length > 0 && (
            <button
              type="button"
              className={styles.clearAllBtn}
              onClick={clearCart}
              data-testid="clear-cart-btn"
            >
              Xóa toàn bộ giỏ hàng
            </button>
          )}
        </div>

        <header>
          <span className={styles.brand}>BREWLITE CART</span>
          <h1 className={styles.title}>Giỏ hàng của bạn</h1>
          <p className={styles.subtitle}>
            Kiểm tra lại đồ uống, kích cỡ, topping và số lượng trước khi đặt đơn
          </p>
        </header>

        {!hydrated ? (
          <section className={`${styles.card} ${styles.emptyBox}`}>
            <p className={styles.subtitle}>Đang tải giỏ hàng...</p>
          </section>
        ) : visibleItems.length === 0 ? (
          <section
            className={`${styles.card} ${styles.emptyBox}`}
            data-testid="cart-empty"
          >
            <div className={styles.emptyIcon} aria-hidden="true">
              🛒
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>
              Giỏ hàng của bạn đang trống
            </h2>
            <p className={styles.subtitle}>
              Hãy chọn những món đồ uống yêu thích từ thực đơn BrewLite nhé.
            </p>
            <Link href="/menu" className={styles.secondaryButton}>
              Khám phá thực đơn ngay
            </Link>
          </section>
        ) : (
          <>
            <section className={styles.card}>
              <div className={styles.itemList}>
                {visibleItems.map((item) => {
                  const unitPrice = calculateCartItemUnitPrice(item);
                  const lineTotal = calculateCartItemLineTotal(item);
                  const maxAllowed = Math.min(20, Math.max(1, item.maxStock ?? 20));

                  return (
                    <article
                      key={item.key}
                      className={styles.itemRow}
                      data-testid="cart-item-row"
                    >
                      <div className={styles.itemThumb}>
                        {item.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span>☕</span>
                        )}
                      </div>

                      <div className={styles.itemMain}>
                        <h2 className={styles.itemName}>{item.name}</h2>
                        <div className={styles.badgeRow}>
                          <span className={styles.sizeBadge}>
                            Size {item.size}
                            {item.sizeExtraPrice > 0
                              ? ` (+${item.sizeExtraPrice.toLocaleString("vi-VN")}đ)`
                              : ""}
                          </span>
                        </div>
                        {item.toppings.length > 0 && (
                          <p className={styles.metaText}>
                            Topping:{" "}
                            {item.toppings
                              .map(
                                (t) =>
                                  `${t.name} (+${t.price.toLocaleString("vi-VN")}đ)`
                              )
                              .join(", ")}
                          </p>
                        )}
                        <p className={styles.metaText}>
                          Đơn giá: {unitPrice.toLocaleString("vi-VN")}đ / ly
                        </p>
                        {item.note && (
                          <p className={styles.noteText}>
                            Ghi chú: &ldquo;{item.note}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className={styles.itemActions}>
                        <strong
                          className={styles.lineTotal}
                          data-testid={`cart-item-total-${item.key}`}
                        >
                          {lineTotal.toLocaleString("vi-VN")}đ
                        </strong>

                        <div className={styles.qtyControls}>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            aria-label={`Giảm số lượng ${item.name}`}
                            onClick={() => updateQuantity(item.key, -1)}
                          >
                            −
                          </button>
                          <span data-testid={`cart-item-qty-${item.key}`}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            aria-label={`Tăng số lượng ${item.name}`}
                            disabled={item.quantity >= maxAllowed}
                            onClick={() => updateQuantity(item.key, 1)}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className={styles.removeBtn}
                          aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                          onClick={() => removeItem(item.key)}
                        >
                          Xóa món
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className={styles.card} data-testid="cart-summary">
              <div className={styles.summaryRow}>
                <span>Tổng số lượng</span>
                <strong data-testid="cart-total-count">{totalCount} ly</strong>
              </div>
              <div className={styles.summaryTotal}>
                <span>Tạm tính</span>
                <span data-testid="cart-subtotal">
                  {subtotal.toLocaleString("vi-VN")}đ
                </span>
              </div>

              <div style={{ marginTop: "18px" }}>
                <Link
                  href="/checkout"
                  className={styles.primaryButton}
                  data-testid="proceed-to-checkout-btn"
                >
                  Tiến hành đặt đơn &amp; Thanh toán
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
