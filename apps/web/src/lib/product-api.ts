import axios from "axios";
import { Product } from "../types/product";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface ApiProduct {
  id: string | number;
  name: string;
  description?: string;
  basePrice?: number;
  price?: number;
  imageUrl?: string;
  image?: string;
  category?: string | { name?: string };
  isAvailable?: boolean;
  stockQuantity?: number;
}

interface ProductResponse {
  data?: ApiProduct[];
  products?: ApiProduct[];
}

function normalizeProduct(item: ApiProduct): Product {
  return {
    id: String(item.id),
    name: item.name,
    description: item.description ?? "",
    basePrice: Number(item.basePrice ?? item.price ?? 0),
    imageUrl: item.imageUrl ?? item.image ?? "",
    category:
      typeof item.category === "string"
        ? item.category
        : item.category?.name ?? "Khác",
    isAvailable: item.isAvailable ?? true,
    stockQuantity: item.stockQuantity,
  };
}

export async function getProducts(): Promise<Product[]> {
  const response = await axios.get<ApiProduct[] | ProductResponse>(
    `${API_URL}/products`
  );

  const result = response.data;

  const products = Array.isArray(result)
    ? result
    : result.data ?? result.products ?? [];

  return products.map(normalizeProduct);
}
