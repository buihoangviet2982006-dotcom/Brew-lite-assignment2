import type { CSSProperties } from "react";
import Link from "next/link";
import type { Product } from "../../types/product";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

const cardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: "16px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  boxShadow: "0 3px 12px rgba(60, 40, 25, 0.06)",
};

const imageStyle: CSSProperties = {
  width: "100%",
  height: "190px",
  objectFit: "cover",
  display: "block",
  background: "#f5eee7",
};

const infoStyle: CSSProperties = {
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  gap: "10px",
};

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  background: "#70452c",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const isAvailable =
    product.isAvailable && (product.stockQuantity ?? 1) > 0;

  const price = Number.isFinite(product.basePrice)
    ? product.basePrice
    : 0;

  return (
    <article style={cardStyle}>
      <div style={{ position: "relative" }}>
        {product.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.imageUrl}
            alt={product.name}
            style={imageStyle}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              ...imageStyle,
              display: "grid",
              placeItems: "center",
              fontSize: "52px",
            }}
            aria-label="Không có hình ảnh sản phẩm"
          >
            ☕
          </div>
        )}

        {!isAvailable && (
          <span
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              padding: "6px 10px",
              borderRadius: "20px",
              background: "#333333",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Hết hàng
          </span>
        )}
      </div>

      <div style={infoStyle}>
        <h3
          style={{
            margin: 0,
            color: "#35271f",
            fontSize: "17px",
            fontWeight: 700,
          }}
        >
          {product.name}
        </h3>

        {product.description && (
          <p
            style={{
              margin: 0,
              color: "#786b62",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {product.description}
          </p>
        )}

        <div
          style={{
            marginTop: "auto",
            paddingTop: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <strong style={{ color: "#70452c", fontSize: "17px" }}>
            {price.toLocaleString("vi-VN")}đ
          </strong>

          {!isAvailable ? (
            <button
              type="button"
              disabled
              aria-label={`${product.name} đã hết hàng`}
              style={{
                ...buttonStyle,
                opacity: 0.5,
                cursor: "not-allowed",
              }}
            >
              Hết hàng
            </button>
          ) : onAddToCart ? (
            <button
              type="button"
              aria-label={`Chọn ${product.name}`}
              onClick={() => onAddToCart(product)}
              style={buttonStyle}
            >
              Chọn món
            </button>
          ) : (
            <Link
              href={`/menu/${product.id}`}
              aria-label={`Chọn size và topping cho ${product.name}`}
              data-testid={`select-product-${product.id}`}
              style={buttonStyle}
            >
              Chọn món
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
