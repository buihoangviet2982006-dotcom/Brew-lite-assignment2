"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "../../components/menu/ProductCard";
import { getProducts } from "../../lib/product-api";
import { Product } from "../../types/product";
import styles from "./menu.module.css";

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Lỗi tải danh sách sản phẩm:", err);
        setError("Không thể tải Menu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.category || "Khác");

    return ["Tất cả", ...Array.from(new Set(values))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesKeyword = product.name
        .toLowerCase()
        .includes(keyword.toLowerCase());

      const matchesCategory =
        selectedCategory === "Tất cả" ||
        (product.category || "Khác") === selectedCategory;

      return matchesKeyword && matchesCategory;
    });
  }, [products, keyword, selectedCategory]);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.brand}>BREWLITE</span>
          <h1>Menu của chúng tôi</h1>
          <p>Chọn thức uống yêu thích của bạn</p>
        </div>

        <div className={styles.avatar}>B</div>
      </header>

      <section className={styles.searchSection}>
        <input
          type="search"
          placeholder="Tìm kiếm đồ uống..."
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          aria-label="Tìm kiếm sản phẩm"
        />
      </section>

      <section className={styles.categorySection}>
        <h2>Danh mục</h2>

        <div className={styles.categoryList}>
          {categories.map((category) => (
            <button
              key={category}
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
          <h2>Thức uống</h2>
          <span>{filteredProducts.length} món</span>
        </div>

        {loading ? (
          <p className={styles.message}>Đang tải Menu...</p>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : filteredProducts.length === 0 ? (
          <p className={styles.message}>Không tìm thấy sản phẩm.</p>
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
