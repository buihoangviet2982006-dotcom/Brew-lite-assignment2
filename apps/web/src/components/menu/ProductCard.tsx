import { Product } from "../../types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const isAvailable =
    product.isAvailable && (product.stockQuantity ?? 1) > 0;

  return (
    <article className="product-card">
      <div className="product-image">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <span>☕</span>
        )}

        {!isAvailable && (
          <span className="sold-out">Hết hàng</span>
        )}
      </div>

      <div className="product-info">
        <h3>{product.name}</h3>

        {product.description && (
          <p>{product.description}</p>
        )}

        <div className="product-bottom">
          <strong>
            {product.basePrice.toLocaleString("vi-VN")}đ
          </strong>

          <button disabled={!isAvailable}>
            {isAvailable ? "Chọn món" : "Hết hàng"}
          </button>
        </div>
      </div>
    </article>
  );
}
