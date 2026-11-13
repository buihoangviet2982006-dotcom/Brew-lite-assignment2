import axios from "axios";
import type { PaymentMethod } from "../types/order";
import type {
  CreatePaymentPayload,
  PaymentApiError,
  PaymentResultResponse,
  SimulateSepayWebhookPayload,
} from "../types/payment";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

function createUuidV4(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getIdempotencyStorageKey(
  orderId: string,
  method: PaymentMethod
): string {
  return `brewlite_idempotency_${orderId}_${method}`;
}

/**
 * Sinh hoặc lấy lại khóa Idempotency-Key gắn với (orderId, method).
 * Đảm bảo nếu khách hàng bấm nút "Thanh toán" nhiều lần liên tiếp do mạng lag,
 * Client vẫn gửi cùng một Idempotency-Key để chống trừ tiền trùng.
 */
export function getOrCreateIdempotencyKey(
  orderId: string,
  method: PaymentMethod
): string {
  if (typeof window === "undefined") {
    return createUuidV4();
  }

  const storageKey = getIdempotencyStorageKey(orderId, method);
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing && existing.trim()) {
    return existing.trim();
  }

  const generated = createUuidV4();
  window.sessionStorage.setItem(storageKey, generated);
  return generated;
}

export function clearIdempotencyKey(
  orderId: string,
  method: PaymentMethod
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(getIdempotencyStorageKey(orderId, method));
}

function parsePaymentError(
  error: unknown,
  fallbackMessage: string
): PaymentApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | {
          message?: string | string[];
          orderStatus?: string;
        }
      | undefined;

    const rawMessage = data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(". ")
      : rawMessage || fallbackMessage;

    return {
      status,
      message,
      orderStatus: data?.orderStatus,
    };
  }

  return {
    message: fallbackMessage,
  };
}

export async function initiatePayment(
  payload: CreatePaymentPayload,
  token: string,
  explicitIdempotencyKey?: string
): Promise<PaymentResultResponse> {
  const idempotencyKey =
    explicitIdempotencyKey ||
    payload.idempotencyKey ||
    getOrCreateIdempotencyKey(payload.orderId, payload.method);

  try {
    const response = await axios.post<PaymentResultResponse>(
      `${API_URL}/payments`,
      {
        ...payload,
        idempotencyKey,
      },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw parsePaymentError(
      error,
      "Không thể khởi tạo giao dịch thanh toán. Vui lòng thử lại."
    );
  }
}

export async function pollOrderPaymentStatus(
  orderId: string,
  token: string
): Promise<PaymentResultResponse> {
  try {
    const response = await axios.get<PaymentResultResponse>(
      `${API_URL}/payments/order/${encodeURIComponent(orderId)}/status`,
      {
        timeout: 8000,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw parsePaymentError(
      error,
      "Không thể kiểm tra trạng thái thanh toán của đơn hàng."
    );
  }
}

export async function simulateSepaySandboxWebhook(
  payload: SimulateSepayWebhookPayload
): Promise<{
  success: boolean;
  idempotentReplayed?: boolean;
  orderId: string;
  paymentId?: string;
  status: string;
  orderStatus: string;
  loyaltyPointsEarned?: number;
}> {
  try {
    const response = await axios.post(
      `${API_URL}/payments/sepay-webhook/simulate`,
      payload,
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw parsePaymentError(
      error,
      "Lỗi khi kích hoạt giả lập SePay Sandbox Webhook."
    );
  }
}

