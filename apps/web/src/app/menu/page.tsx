"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductCard from "../../components/menu/ProductCard";
import { MenuSkeleton } from "../../components/ui/MenuSkeleton";
import { EmptyState } from "../../components/ui/EmptySate";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { getProducts } from "../../lib/product-api";
import type { Product } from "../../types/product";
import styles from "./menu.module.css";

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
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
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}