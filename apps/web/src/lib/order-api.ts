import axios from "axios";
import type {
  CheckoutCartItem,
  CheckoutTopping,
  CreatedOrderResponse,
  CreateOrderPayload,
  ProductSize,
} from "../types/order";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

const TOKEN_STORAGE_KEYS = [
  "accessToken",
  "token",
  "jwt",
  "brewlite_token",
  "auth-storage",
  "brewlite-auth",
];

const CART_STORAGE_KEYS = [
  "brewlite-cart",
  "cart-storage",
  "cart",
  "cartItems",
];

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  for (const key of TOKEN_STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    if (!raw.startsWith("{")) {
      return raw.replace(/^"|"$/g, "").trim() || null;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const state = (parsed.state as Record<string, unknown>) ?? parsed;
      const token =
        state.accessToken ?? state.token ?? parsed.accessToken ?? parsed.token;
      if (typeof token === "string" && token.trim()) {
        return token.trim();
      }
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeCartEntry(
  raw: Record<string, unknown>,
  index: number
): CheckoutCartItem | null {
  const productObj =
    typeof raw.product === "object" && raw.product !== null
      ? (raw.product as Record<string, unknown>)
      : undefined;

  const productId = String(
    raw.productId ?? productObj?.id ?? raw.id ?? ""
  ).trim();
  const name = String(
    raw.productName ?? raw.name ?? productObj?.name ?? ""
  ).trim();

  if (!productId || !name) return null;

  const basePrice = Number(
    raw.basePrice ??
      raw.price ??
      raw.unitPrice ??
      productObj?.basePrice ??
      productObj?.price ??
      0
  );

  const rawSize = String(raw.size ?? "M").toUpperCase();
  const size: ProductSize =
    rawSize === "S" || rawSize === "M" || rawSize === "L" ? rawSize : "M";

  const quantity = Math.max(1, Math.floor(Number(raw.quantity ?? raw.qty ?? 1)));

  const rawToppings = Array.isArray(raw.toppings) ? raw.toppings : [];
  const toppings: CheckoutTopping[] = rawToppings
    .map((t): CheckoutTopping | null => {
      if (typeof t === "object" && t !== null) {
        const tobj = t as Record<string, unknown>;
        if (!tobj.id) return null;
        return {
          id: String(tobj.id),
          name: String(tobj.name ?? "Topping"),
          price: Number(tobj.price ?? 0),
        };
      }
      return null;
    })
    .filter((t): t is CheckoutTopping => t !== null);

  return {
    key: String(
      raw.key ??
        `${productId}-${size}-${toppings.map((t) => t.id).join(",")}-${index}`
    ),
    productId,
    name,
    basePrice: Number.isFinite(basePrice) ? basePrice : 0,
    imageUrl: String(raw.imageUrl ?? productObj?.imageUrl ?? ""),
    size,
    quantity,
    toppings,
  };
}

export function loadCheckoutCart(): CheckoutCartItem[] {
  if (typeof window === "undefined") return [];

  for (const key of CART_STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      let list: unknown[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        const state =
          typeof obj.state === "object" && obj.state !== null
            ? (obj.state as Record<string, unknown>)
            : obj;
        if (Array.isArray(state.items)) {
          list = state.items;
        } else if (Array.isArray(state.cartItems)) {
          list = state.cartItems;
        }
      }

      const normalized = list
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        )
        .map(normalizeCartEntry)
        .filter((item): item is CheckoutCartItem => item !== null);

      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      continue;
    }
  }

  return [];
}

export function saveCheckoutCart(items: CheckoutCartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("brewlite-cart", JSON.stringify(items));
}

export function clearCheckoutCart(): void {
  if (typeof window === "undefined") return;
  for (const key of CART_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export interface CreateOrderApiError {
  status?: number;
  message: string;
  outOfStockProductIds?: string[];
}

export async function createOrder(
  payload: CreateOrderPayload,
  token: string
): Promise<CreatedOrderResponse> {
  try {
    const response = await axios.post<CreatedOrderResponse>(
      `${API_URL}/orders`,
      payload,
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data as
        | {
            message?: string | string[];
            outOfStockProductIds?: string[];
          }
        | undefined;

      const rawMessage = data?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(". ")
        : rawMessage || "Không thể tạo đơn hàng. Vui lòng thử lại.";

      const customError: CreateOrderApiError = {
        status,
        message,
        outOfStockProductIds: data?.outOfStockProductIds,
      };
      throw customError;
    }

    throw {
      message: "Lỗi kết nối máy chủ khi tạo đơn hàng.",
    } satisfies CreateOrderApiError;
  }
}

