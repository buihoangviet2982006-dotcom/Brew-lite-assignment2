import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import CheckoutPage from "../app/checkout/page";
import * as orderApi from "../lib/order-api";
import * as paymentApi from "../lib/payment-api";

vi.mock("../lib/product-api", () => ({
  getProducts: vi.fn(),
}));

describe("CheckoutPage & VietQR / SePay Sandbox Payment Flow", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const sampleCart = [
    {
      key: "prod-1-M-0",
      productId: "prod-1",
      name: "Cà phê sữa đá BrewLite",
      basePrice: 39000,
      imageUrl: "",
      size: "M",
      quantity: 2,
      toppings: [{ id: "top-1", name: "Trân châu", price: 10000 }],
    },
  ];

  it("1. Sinh cùng một Idempotency-Key cho cùng một (orderId, method) để chống bấm đúp", () => {
    const key1 = paymentApi.getOrCreateIdempotencyKey("order-999", "WALLET");
    const key2 = paymentApi.getOrCreateIdempotencyKey("order-999", "WALLET");
    const keyCard = paymentApi.getOrCreateIdempotencyKey("order-999", "CARD");

    expect(key1).toBe(key2);
    expect(key1).not.toBe(keyCard);
  });

  it("2. Chọn WALLET hoặc CARD -> Tạo đơn -> Hiển thị Modal mã QR VietQR và chốt đơn PAID khi SePay Sandbox xác nhận", async () => {
    window.localStorage.setItem("accessToken", "valid-jwt-token");
    window.localStorage.setItem("brewlite-cart", JSON.stringify(sampleCart));

    vi.spyOn(orderApi, "createOrder").mockResolvedValue({
      id: "order-abc-123",
      orderId: "order-abc-123",
      userId: "user-1",
      status: "PENDING",
      subtotal: 98000,
      discountAmount: 0,
      total: 98000,
      createdAt: new Date().toISOString(),
    });

    vi.spyOn(paymentApi, "initiatePayment").mockResolvedValue({
      id: "pending-session-1",
      orderId: "order-abc-123",
      idempotencyKey: "idem-uuid-123",
      amount: 98000,
      method: "CARD",
      status: "PENDING",
      orderStatus: "PENDING",
      paymentRef: "BREWORDERABC",
      qrCodeUrl:
        "https://img.vietqr.io/image/MB-0123456789-compact2.png?amount=98000&addInfo=BREWORDERABC",
      bankInfo: {
        bankId: "MB",
        accountNo: "0123456789",
        accountName: "BREWLITE COFFEE",
        template: "compact2",
        source: "SEPAY_SANDBOX_API",
      },
      loyaltyPointsEarned: 0,
      idempotentReplayed: false,
      createdAt: new Date().toISOString(),
    });

    vi.spyOn(paymentApi, "simulateSepaySandboxWebhook").mockResolvedValue({
      success: true,
      orderId: "order-abc-123",
      status: "SUCCEEDED",
      orderStatus: "PAID",
      loyaltyPointsEarned: 9,
    });

    vi.spyOn(paymentApi, "pollOrderPaymentStatus").mockResolvedValue({
      id: "pay-final-1",
      orderId: "order-abc-123",
      idempotencyKey: "idem-uuid-123",
      amount: 98000,
      method: "CARD",
      status: "SUCCEEDED",
      orderStatus: "PAID",
      paymentRef: "BREWORDERABC",
      qrCodeUrl:
        "https://img.vietqr.io/image/MB-0123456789-compact2.png?amount=98000&addInfo=BREWORDERABC",
      bankInfo: {
        bankId: "MB",
        accountNo: "0123456789",
        accountName: "BREWLITE COFFEE",
        template: "compact2",
        source: "SEPAY_SANDBOX_API",
      },
      loyaltyPointsEarned: 9,
      idempotentReplayed: false,
      createdAt: new Date().toISOString(),
    });

    await act(async () => {
      root.render(<CheckoutPage />);
    });

    // Đổi sang phương thức Thẻ ngân hàng (CARD) - vẫn dùng quét mã VietQR
    const cardBtn = container.querySelector(
      '[data-testid="method-card-btn"]'
    ) as HTMLButtonElement;
    expect(cardBtn).not.toBeNull();

    await act(async () => {
      cardBtn.click();
    });

    const submitBtn = container.querySelector(
      '[data-testid="submit-order-btn"]'
    ) as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();

    await act(async () => {
      submitBtn.click();
    });

    // Hiển thị Modal VietQR
    const modal = container.querySelector(
      '[data-testid="vietqr-payment-modal"]'
    );
    expect(modal).not.toBeNull();

    const qrImg = container.querySelector(
      '[data-testid="vietqr-image"]'
    ) as HTMLImageElement;
    expect(qrImg?.src).toContain(
      "img.vietqr.io/image/MB-0123456789-compact2.png"
    );
    expect(
      container.querySelector('[data-testid="vietqr-payment-ref"]')?.textContent
    ).toContain("BREWORDERABC");

    // Nhấn nút giả lập SePay Sandbox Webhook thành công
    const simSuccessBtn = container.querySelector(
      '[data-testid="simulate-webhook-success-btn"]'
    ) as HTMLButtonElement;
    expect(simSuccessBtn).not.toBeNull();

    await act(async () => {
      simSuccessBtn.click();
    });

    // Chuyển sang màn hình xác nhận PAID và xóa giỏ hàng
    const successBanner = container.querySelector(
      '[data-testid="payment-success-banner"]'
    );
    expect(successBanner).not.toBeNull();
    expect(
      container.querySelector('[data-testid="paid-order-status"]')?.textContent
    ).toBe("PAID");
    expect(window.localStorage.getItem("brewlite-cart")).toBeNull();
  });

  it("3. Khi thanh toán thất bại (MOCK_FAIL), giữ nguyên giỏ hàng để khách thử lại", async () => {
    window.localStorage.setItem("accessToken", "valid-jwt-token");
    window.localStorage.setItem("brewlite-cart", JSON.stringify(sampleCart));

    vi.spyOn(orderApi, "createOrder").mockResolvedValue({
      id: "order-fail-1",
      orderId: "order-fail-1",
      userId: "user-1",
      status: "PENDING",
      subtotal: 98000,
      discountAmount: 0,
      total: 98000,
      createdAt: new Date().toISOString(),
    });

    vi.spyOn(paymentApi, "initiatePayment").mockRejectedValue({
      status: 400,
      message:
        "Thanh toán không thành công: Tài khoản không đủ số dư hoặc giao dịch bị từ chối.",
    });

    await act(async () => {
      root.render(<CheckoutPage />);
    });

    const submitBtn = container.querySelector(
      '[data-testid="submit-order-btn"]'
    ) as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();

    await act(async () => {
      submitBtn.click();
    });

    const errorEl = container.querySelector('[data-testid="checkout-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain("Thanh toán không thành công");

    // Giỏ hàng vẫn được giữ nguyên trong localStorage
    expect(window.localStorage.getItem("brewlite-cart")).not.toBeNull();
  });
});
