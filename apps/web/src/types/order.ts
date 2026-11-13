export type ProductSize = "S" | "M" | "L";
export type PaymentMethod = "WALLET" | "CARD";

export interface CheckoutTopping {
  id: string;
  name: string;
  price: number;
}

export interface CheckoutCartItem {
  key: string;
  productId: string;
  name: string;
  basePrice: number;
  imageUrl?: string;
  size: ProductSize;
  quantity: number;
  toppings: CheckoutTopping[];
}

export interface CreateOrderItemPayload {
  productId: string;
  size: ProductSize;
  quantity: number;
  toppingIds?: string[];
}

export interface CreateOrderPayload {
  items: CreateOrderItemPayload[];
  promotionCode?: string;
}

export interface CreatedOrderResponse {
  id: string;
  orderId: string;
  userId: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  promotionId?: string | null;
  createdAt: string;
}