"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductCard from "../../components/menu/ProductCard";
import { getProducts } from "../../lib/product-api";
import type { Product } from "../../types/product";
import styles from "./menu.module.css";

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts();

      setProducts(data);
    } catch (err) {
      console.error("Không thể tải danh sách sản phẩm:", err);

      setProducts([]);
      setError(
        "Không thể kết nối đến máy chủ sản phẩm. Vui lòng kiểm tra Backend và địa chỉ API."
      );
    } finally {
      setLoading(false);
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

        {loading ? (
          <div
            className={styles.message}
            role="status"
            aria-live="polite"
          >
            Đang tải Menu...
          </div>
        ) : error ? (
          <div className={styles.errorBox} role="alert">
            <p>{error}</p>

            <button
              type="button"
              className={styles.retryButton}
              onClick={() => void loadProducts()}
            >
              Thử lại
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>
              {products.length === 0
                ? "Menu hiện chưa có sản phẩm"
                : "Không tìm thấy sản phẩm"}
            </h3>

            <p>
              {products.length === 0
                ? "Hiện tại chưa có thức uống nào được thêm vào hệ thống."
                : "Hãy thử từ khóa hoặc danh mục khác."}
            </p>

            {products.length > 0 && (
              <button
                type="button"
                className={styles.resetButton}
                onClick={() => {
                  setKeyword("");
                  setSelectedCategory("Tất cả");
                }}
              >
                Xóa bộ lọc
              </button>
            )}

            {products.length === 0 && (
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => void loadProducts()}
              >
                Tải lại
              </button>
            )}
          </div>
        ) : (
          <div className={styles.productGrid}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
