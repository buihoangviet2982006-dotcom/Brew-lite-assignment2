"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductCard from "../../components/menu/ProductCard";
import { MenuSkeleton } from "../../components/ui/MenuSkeleton";
import { EmptyState } from "../../components/ui/EmptySate";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { getProducts } from "../../lib/product-api";
import type { Product } from "../../types/product";
import styles from "./menu.module.css";

interface CartItem {
  product: Product;
  quantity: number;
}


export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  const loadProducts = useCallback(async (isRetry = false) => {
    try {
      if (isRetry) {
        setIsRetrying(true);
      } else {
        setLoading(true);
      }
      setError("");

      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Không thể tải danh sách sản phẩm:", err);

      setProducts([]);
      setError(
        "Không thể kết nối đến máy chủ sản phẩm. Vui lòng kiểm tra Backend và địa chỉ API."
      );
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const values = products.map(
      (product) => product.category?.trim() || "Khác"
    );

    return ["Tất cả", ...Array.from(new Set(values))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword
      .trim()
      .toLocaleLowerCase("vi");

    return products.filter((product) => {
      const matchesKeyword =
        product.name
          .toLocaleLowerCase("vi")
          .includes(normalizedKeyword) ||
        (product.description ?? "")
          .toLocaleLowerCase("vi")
          .includes(normalizedKeyword);

      const productCategory = product.category?.trim() || "Khác";

      const matchesCategory =
        selectedCategory === "Tất cả" ||
        productCategory === selectedCategory;

      return matchesKeyword && matchesCategory;
    });
  }, [products, keyword, selectedCategory]);

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.product.basePrice * item.quantity,
        0
      ),
    [cartItems]
  );

  const addToCart = useCallback((product: Product) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentItems, { product, quantity: 1 }];
    });
  }, []);

  const changeCartQuantity = useCallback(
    (productId: string, change: number) => {
      setCartItems((currentItems) =>
        currentItems.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(1, item.quantity + change) }
            : item
        )
      );
    },
    []
  );

  const removeFromCart = useCallback((productId: string) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.product.id !== productId)
    );
  }, []);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.brand}>BREWLITE</span>
          <h1 className={styles.title}>Menu của chúng tôi</h1>
          <p className={styles.subtitle}>
            Chọn thức uống yêu thích của bạn
          </p>
        </div>

        <div className={styles.avatar} aria-label="BrewLite">
          B
        </div>
      </header>

      <section className={styles.searchSection}>
        <label className={styles.srOnly} htmlFor="menu-search">
          Tìm kiếm thức uống
        </label>

        <input
          id="menu-search"
          className={styles.searchInput}
          type="search"
          placeholder="Tìm kiếm đồ uống..."
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </section>

      <section className={styles.categorySection}>
        <h2 className={styles.sectionTitle}>Danh mục</h2>

        <div className={styles.categoryList}>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={selectedCategory === category}
              className={
                selectedCategory === category
                  ? styles.activeCategory
                  : styles.categoryButton
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.menuSection}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>Thức uống</h2>

          {!loading && !error && (
            <span className={styles.productCount}>
              {filteredProducts.length} món
            </span>
          )}
        </div>

        {/* 1. Trạng thái Đang tải: Gọi MenuSkeleton của TV6 */}
        {loading ? (
          <MenuSkeleton count={6} />
        ) : error ? (
          /* 2. Trạng thái Báo lỗi: Gọi ErrorAlert của TV6 */
          <ErrorAlert
            message={error}
            isRetrying={isRetrying}
            onRetry={() => void loadProducts(true)}
          />
        ) : filteredProducts.length === 0 ? (
          /* 3. Trạng thái Danh sách trống: Gọi EmptyState của TV6 */
          <EmptyState
            message={
              products.length === 0
                ? "Menu hiện chưa có sản phẩm"
                : "Không tìm thấy sản phẩm"
            }
            description={
              products.length === 0
                ? "Hiện tại chưa có thức uống nào được thêm vào hệ thống."
                : "Hãy thử từ khóa hoặc danh mục khác."
            }
            actionLabel={products.length > 0 ? "Xóa bộ lọc" : "Tải lại"}
            onReset={() => {
              if (products.length > 0) {
                setKeyword("");
                setSelectedCategory("Tất cả");
              } else {
                void loadProducts();
              }
            }}
          />
        ) : (
          /* 4. Trạng thái Thành công: Danh sách món */
          <div className={styles.productGrid}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.cartSection} aria-labelledby="cart-title">
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle} id="cart-title">
            Giỏ hàng
          </h2>
          <span data-testid="cart-count">
            {cartItems.reduce((count, item) => count + item.quantity, 0)} món
          </span>
        </div>

        {cartItems.length === 0 ? (
          <p className={styles.cartEmpty}>Giỏ hàng đang trống.</p>
        ) : (
          <ul className={styles.cartList}>
            {cartItems.map((item) => (
              <li className={styles.cartItem} key={item.product.id}>
                <div className={styles.cartProduct}>
                  <strong>{item.product.name}</strong>
                  <span>
                    {item.product.basePrice.toLocaleString("vi-VN")}đ / món
                  </span>
                </div>

                <div
                  className={styles.quantityControls}
                  aria-label={`Số lượng ${item.product.name}`}
                >
                  <button
                    type="button"
                    aria-label={`Giảm số lượng ${item.product.name}`}
                    disabled={item.quantity <= 1}
                    onClick={() => changeCartQuantity(item.product.id, -1)}
                  >
                    −
                  </button>
                  <span aria-live="polite">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Tăng số lượng ${item.product.name}`}
                    onClick={() => changeCartQuantity(item.product.id, 1)}
                  >
                    +
                  </button>
                </div>

                <strong>
                  {(item.product.basePrice * item.quantity).toLocaleString(
                    "vi-VN"
                  )}
                  đ
                </strong>

                <button
                  className={styles.removeButton}
                  type="button"
                  aria-label={`Xóa ${item.product.name} khỏi giỏ hàng`}
                  onClick={() => removeFromCart(item.product.id)}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.cartTotal} aria-live="polite">
          Tổng tiền:{" "}
          <strong data-testid="cart-total">
            {cartTotal.toLocaleString("vi-VN")}đ
          </strong>
        </p>
      </section>
    </main>
  );
}