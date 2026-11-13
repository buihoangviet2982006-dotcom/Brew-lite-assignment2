import type { PaymentMethod } from "./order";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED";
export type PaymentSimulationScenario =
  | "QR"
  | "SUCCESS"
  | "MOCK_FAIL"
  | "TIMEOUT";

export interface VietQrBankInfo {
  bankId: string;
  accountNo: string;
  accountName: string;
  template: string;
  source: "SEPAY_SANDBOX_API" | "ENV_FALLBACK";
}

export interface CreatePaymentPayload {
  orderId: string;
  method: PaymentMethod;
  idempotencyKey?: string;
  simulateScenario?: PaymentSimulationScenario;
}

export interface PaymentResultResponse {
  id: string;
  orderId: string;
  idempotencyKey: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  orderStatus: string;
  paymentRef: string;
  qrCodeUrl: string;
  bankInfo: VietQrBankInfo;
  loyaltyPointsEarned: number;
  idempotentReplayed: boolean;
  transactionRef?: string;
  createdAt: string;
}

export interface SimulateSepayWebhookPayload {
  orderId: string;
  method?: PaymentMethod;
  transferAmount?: number;
  scenario?: "SUCCESS" | "MOCK_FAIL" | "TIMEOUT";
  idempotencyKey?: string;
}

export interface PaymentApiError {
  status?: number;
  message: string;
  orderStatus?: string;
}

