import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductSize } from "../types/order";

export interface CartToppingItem {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  basePrice: number;
  imageUrl?: string;
  size: ProductSize;
  sizeExtraPrice: number;
  quantity: number;
  toppings: CartToppingItem[];
  note?: string;
  maxStock?: number;
}

export interface AddToCartInput {
  productId: string;
  name: string;
  basePrice: number;
  imageUrl?: string;
  size: ProductSize;
  sizeExtraPrice: number;
  quantity: number;
  toppings: CartToppingItem[];
  note?: string;
  maxStock?: number;
}

export const SIZE_EXTRA_PRICE_MAP: Record<ProductSize, number> = {
  S: 0,
  M: 6000,
  L: 10000,
};

export function buildCartItemKey(input: {
  productId: string;
  size: ProductSize;
  toppings: CartToppingItem[];
  note?: string;
}): string {
  const sortedToppingIds = [...input.toppings]
    .map((t) => t.id)
    .sort()
    .join(",");
  const normalizedNote = (input.note ?? "").trim().toLowerCase();
  return `${input.productId}__${input.size}__${sortedToppingIds}__${normalizedNote}`;
}

export function calculateCartItemUnitPrice(item: {
  basePrice: number;
  size: ProductSize;
  sizeExtraPrice?: number;
  toppings: CartToppingItem[];
}): number {
  const base = Math.max(0, Number(item.basePrice) || 0);
  const sizeExtra = Math.max(
    0,
    Number(item.sizeExtraPrice ?? SIZE_EXTRA_PRICE_MAP[item.size] ?? 0)
  );
  const toppingsPrice = item.toppings.reduce(
    (sum, topping) => sum + Math.max(0, Number(topping.price) || 0),
    0
  );
  return base + sizeExtra + toppingsPrice;
}

export function calculateCartItemLineTotal(item: CartItem): number {
  return calculateCartItemUnitPrice(item) * Math.max(1, item.quantity);
}

export function calculateCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + calculateCartItemLineTotal(item), 0);
}

export function calculateCartTotalCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
}

interface CartState {
  items: CartItem[];
  addItem: (input: AddToCartInput) => void;
  updateQuantity: (key: string, delta: number) => void;
  setItemQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (input) =>
        set((state) => {
          const normalizedNote = (input.note ?? "").trim();
          const key = buildCartItemKey({
            productId: input.productId,
            size: input.size,
            toppings: input.toppings,
            note: normalizedNote,
          });
          const maxAllowed = Math.min(
            20,
            Math.max(1, input.maxStock ?? 20)
          );
          const safeAddQty = Math.max(1, Math.floor(input.quantity || 1));

          const existingIndex = state.items.findIndex(
            (item) => item.key === key
          );

          if (existingIndex > -1) {
            const nextItems = state.items.map((item, idx) =>
              idx === existingIndex
                ? {
                    ...item,
                    quantity: Math.min(maxAllowed, item.quantity + safeAddQty),
                  }
                : item
            );
            return { items: nextItems };
          }

          const newItem: CartItem = {
            key,
            productId: input.productId,
            name: input.name,
            basePrice: Number(input.basePrice) || 0,
            imageUrl: input.imageUrl,
            size: input.size,
            sizeExtraPrice:
              input.sizeExtraPrice ?? SIZE_EXTRA_PRICE_MAP[input.size] ?? 0,
            quantity: Math.min(maxAllowed, safeAddQty),
            toppings: input.toppings.map((t) => ({
              id: t.id,
              name: t.name,
              price: Number(t.price) || 0,
            })),
            ...(normalizedNote ? { note: normalizedNote } : {}),
            ...(input.maxStock !== undefined ? { maxStock: input.maxStock } : {}),
          };

          return { items: [...state.items, newItem] };
        }),

      updateQuantity: (key, delta) =>
        set((state) => {
          const nextItems = state.items
            .map((item) => {
              if (item.key !== key) return item;
              const maxAllowed = Math.min(
                20,
                Math.max(1, item.maxStock ?? 20)
              );
              const nextQty = Math.min(maxAllowed, item.quantity + delta);
              return { ...item, quantity: nextQty };
            })
            .filter((item) => item.quantity > 0);
          return { items: nextItems };
        }),

      setItemQuantity: (key, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((item) => item.key !== key) };
          }
          return {
            items: state.items.map((item) => {
              if (item.key !== key) return item;
              const maxAllowed = Math.min(
                20,
                Math.max(1, item.maxStock ?? 20)
              );
              return {
                ...item,
                quantity: Math.min(maxAllowed, Math.floor(quantity)),
              };
            }),
          };
        }),

      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((item) => item.key !== key),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "brewlite-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
