import axios from "axios";
import type { Product } from "../types/product";
import type { ToppingOption } from "../utils/product-options";

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
  maxAvailableQuantity?: number | null;
}

interface ApiTopping {
  id: string | number;
  name: string;
  price?: number | string | null;
  isAvailable?: boolean | null;
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

  const resolvedStock = item.maxAvailableQuantity ?? item.stockQuantity;

  return {
    id: String(item.id),
    name: item.name,
    description: item.description ?? "",
    basePrice: Number(item.basePrice ?? item.price ?? 0),
    imageUrl: item.imageUrl ?? item.image ?? "",
    category: category?.trim() || "Khác",
    isAvailable: item.isAvailable ?? true,
    stockQuantity:
      resolvedStock == null ? undefined : Number(resolvedStock),
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

export async function getProductById(id: string): Promise<Product> {
  const response = await axios.get<ApiProduct>(
    `${API_URL}/products/${encodeURIComponent(id)}`,
    {
      timeout: 10000,
      headers: {
        Accept: "application/json",
      },
    }
  );
  return normalizeProduct(response.data);
}

export async function getToppings(): Promise<ToppingOption[]> {
  const response = await axios.get<ApiTopping[] | { data?: ApiTopping[] }>(
    `${API_URL}/products/toppings`,
    {
      timeout: 10000,
      headers: {
        Accept: "application/json",
      },
    }
  );

  const rawList = Array.isArray(response.data)
    ? response.data
    : response.data?.data ?? [];

  return rawList
    .filter((item) => item && item.id != null && typeof item.name === "string")
    .map((item) => ({
      id: String(item.id),
      name: item.name,
      price: Number(item.price ?? 0),
      isAvailable: item.isAvailable ?? true,
    }));
}
