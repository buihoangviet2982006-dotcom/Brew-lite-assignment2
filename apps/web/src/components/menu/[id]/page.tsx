"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductOptionSelector } from "../../../components/menu/ProductOptionSelector";
import type { Product } from "../../../types/product";

const FALLBACK_PRODUCTS: Record<string, Product> = {
  "1": {
    id: "1",
    name: "Cà Phê Sữa Đá Sài Gòn",
    description:
      "Cà phê Robusta pha phin truyền thống kết hợp sữa đặc thơm béo, đậm vị.",
    basePrice: 29000,
    category: "Cà phê",
    isAvailable: true,
    stockQuantity: 25,
  },
  "2": {
    id: "2",
    name: "Trà Sữa Oolong Nướng",
    description:
      "Lá trà Oolong rang đậm hương quyện cùng sữa tươi thanh mát.",
    basePrice: 39000,
    category: "Trà sữa",
    isAvailable: true,
    stockQuantity: 18,
  },
};

export default function ProductDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const productId = Array.isArray(rawId) ? rawId[0] : rawId || "1";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  const loadProductDetail = useCallback(async () => {
    try {
      setLoading(true);
      setUsingFallback(false);

      const baseUrl = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      ).replace(/\/$/, "");

      let res = await fetch(`${baseUrl}/products/${productId}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        res = await fetch(`${baseUrl}/api/products/${productId}`, {
          cache: "no-store",
        });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as Product;
      setProduct(data);
    } catch {
      // Nếu API chưa bật hoặc không tìm thấy ID, dùng sản phẩm mẫu để luôn kiểm thử được Size & Topping
      const sample = FALLBACK_PRODUCTS[productId] || {
        id: productId,
        name: "Trà Đào Cam Sả Đặc Biệt",
        description:
          "Trà đen ủ lạnh kết hợp đào miếng giòn ngọt, cam vàng và hương sả tươi.",
        basePrice: 35000,
        category: "Trà trái cây",
        isAvailable: true,
        stockQuantity: 15,
      };
      setProduct(sample);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadProductDetail();
  }, [loadProductDetail]);

  const isAvailable =
    Boolean(product?.isAvailable) && (product?.stockQuantity ?? 1) > 0;

  return (
    <main
      style={{
        width: "100%",
        maxWidth: "960px",
        minHeight: "100vh",
        margin: "0 auto",
        padding: "24px 16px 64px",
        background: "#faf9f6",
        color: "#29251f",
      }}
    >
      <style>{`
        .brewlite-detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .brewlite-detail-grid {
            grid-template-columns: 1fr 1.25fr;
            align-items: start;
          }
        }
      `}</style>

      {/* Thanh điều hướng quay lại Menu */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <Link
          href="/menu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: "42px",
            padding: "0 16px",
            borderRadius: "12px",
            border: "1px solid #e3ded6",
            background: "#ffffff",
            color: "#51483e",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Quay lại Menu
        </Link>

        <span
          style={{
            color: "#987044",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "2px",
          }}
        >
          BREWLITE • TÙY CHỌN MÓN
        </span>
      </header>

      {loading ? (
        <div
          role="status"
          style={{
            padding: "48px 20px",
            textAlign: "center",
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid #eee9e2",
            color: "#777",
          }}
        >
          Đang tải thông tin chi tiết thức uống...
        </div>
      ) : product ? (
        <div className="brewlite-detail-grid">
          {/* Cột trái: Thông tin cơ bản của sản phẩm */}
          <section
            style={{
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #eee9e2",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                height: "240px",
                borderRadius: "14px",
                background: "#f0e9df",
                display: "grid",
                placeItems: "center",
                fontSize: "64px",
                marginBottom: "16px",
                overflow: "hidden",
              }}
            >
              <span>☕</span>
            </div>

            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: "16px",
                background: "#f4efe8",
                color: "#795638",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              {product.category || "Thức uống"}
            </span>

            <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 800 }}>
              {product.name}
            </h1>

            <p
              style={{
                margin: "0 0 16px",
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#666",
              }}
            >
              {product.description ||
                "Thức uống pha chế tươi mới mỗi ngày theo công thức chuẩn vị BrewLite."}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "12px",
                borderTop: "1px solid #f0ece5",
              }}
            >
              <div>
                <span style={{ fontSize: "12px", color: "#888", display: "block" }}>
                  Giá gốc (Size S)
                </span>
                <strong style={{ fontSize: "22px", color: "#795638" }}>
                  {product.basePrice.toLocaleString("vi-VN")}đ
                </strong>
              </div>

              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: isAvailable ? "#1e6b24" : "#c0392b",
                }}
              >
                {isAvailable
                  ? `Còn hàng (${product.stockQuantity ?? 20} ly)`
                  : "Hết hàng"}
              </span>
            </div>

            {usingFallback && (
              <p
                style={{
                  marginTop: "12px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "#fdfaf5",
                  border: "1px dashed #cbb89d",
                  fontSize: "12px",
                  color: "#795638",
                }}
              >
                Chế độ hiển thị món mẫu (kết nối tự động khi API GET /products/:id bật).
              </p>
            )}
          </section>

          {/* Cột phải: Bộ chọn Size, Topping và Validation */}
          <ProductOptionSelector
            productId={product.id}
            productName={product.name}
            basePrice={product.basePrice}
            imageUrl={product.imageUrl}
            stockQuantity={product.stockQuantity ?? 20}
            isAvailable={isAvailable}
          />
        </div>
      ) : null}
    </main>
  );
}