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
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderItemDetail {
  id: string;
  productId: string;
  size: ProductSize;
  quantity: number;
  lineTotal: number;
  product?: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
  toppings: CheckoutTopping[];
}

export interface OrderHistoryItem {
  id: string;
  orderId: string;
  userId?: string;
  status: OrderStatus | string;
  subtotal: number;
  discountAmount: number;
  total: number;
  promotionId?: string | null;
  itemCount?: number;
  orderItems: OrderItemDetail[];
  createdAt: string;
  updatedAt: string;
}

export type OrderDetailResponse = OrderHistoryItem & {
  userId: string;
};