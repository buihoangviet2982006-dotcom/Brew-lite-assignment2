import axios from "axios";
import type { Product } from "../types/product";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

interface ApiProduct {
  id: string | number;
  name: string;
  description?: string | null;
  basePrice?: number | string | null;
  price?: number | string | null;
  imageUrl?: string | null;
  image?: string | null;
  category?: string | { name?: string } | null;
  isAvailable?: boolean | null;
  stockQuantity?: number | null;
}

interface ProductResponse {
  data?: ApiProduct[] | { products?: ApiProduct[] };
  products?: ApiProduct[];
}

function normalizeProduct(item: ApiProduct): Product {
  const category =
    typeof item.category === "string"
      ? item.category
      : item.category?.name;

  return {
    id: String(item.id),
    name: item.name,
    description: item.description ?? "",
    basePrice: Number(item.basePrice ?? item.price ?? 0),
    imageUrl: item.imageUrl ?? item.image ?? "",
    category: category?.trim() || "Khác",
    isAvailable: item.isAvailable ?? true,
    stockQuantity:
      item.stockQuantity == null
        ? undefined
        : Number(item.stockQuantity),
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await axios.get<
      ApiProduct[] | ProductResponse
    >(`${API_URL}/products`, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
      },
    });

    const result = response.data;

    let products: ApiProduct[];

    if (Array.isArray(result)) {
      products = result;
    } else if (Array.isArray(result.data)) {
      products = result.data;
    } else if (
      result.data &&
      !Array.isArray(result.data) &&
      Array.isArray(result.data.products)
    ) {
      products = result.data.products;
    } else {
      products = result.products ?? [];
    }

    return products
      .filter(
        (item) =>
          item &&
          item.id !== undefined &&
          item.id !== null &&
          typeof item.name === "string"
      )
      .map(normalizeProduct);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Lỗi kết nối Product API:", {
        url: `${API_URL}/products`,
        status: error.response?.status,
        message: error.message,
        response: error.response?.data,
      });
    } else {
      console.error("Lỗi xử lý dữ liệu sản phẩm:", error);
    }

    throw error;
  }
}
