import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import MenuPage from "../app/menu/page";
import ProductDetailPage from "../app/menu/[id]/page";
import CartPage from "../app/cart/page";
import RegisterPage from "../app/register/page";
import LoginPage from "../app/login/page";
import CheckoutPage from "../app/checkout/page";
import OrderDetailPage from "../app/orders/[id]/page";
import OrderHistoryPage from "../app/orders/page";
import * as productApi from "../lib/product-api";
import * as authApi from "../lib/auth-api";
import * as orderApi from "../lib/order-api";
import * as paymentApi from "../lib/payment-api";
import { useCartStore } from "../store/cart.store";
import { useAuthStore } from "../store/auth.store";
import type { OrderDetailResponse } from "../types/order";

// Mock Next.js navigation (router, searchParams, params)
const mockPush = vi.fn();
let mockSearchParamsMap: Record<string, string | null> = {};
let mockRouteParams: Record<string, string> = { id: "prod-1" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsMap[key] ?? null,
  }),
  useParams: () => mockRouteParams,
}));

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Core End-to-End Flow trên Frontend (6 Bước Xuyên Suốt: Menu -> Chi Tiết/Tùy Chọn -> Giỏ Hàng -> Đăng Ký/Đăng Nhập JWT & Đặt Đơn -> Thanh Toán QR/Idempotency -> Xác Nhận & Lịch Sử Đơn)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    mockSearchParamsMap = {};
    mockRouteParams = { id: "prod-1" };
    window.localStorage.clear();
    window.sessionStorage.clear();
    useCartStore.getState().clearCart();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

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

  it("Thực thi liền mạch toàn bộ 6 bước nghiệp vụ chính của khách hàng trên giao diện Next.js", async () => {
    // =========================================================================
    // BƯỚC 1: XEM MENU (/menu) - Kiểm tra Loading, Empty, Error và Danh sách món
    // =========================================================================
    const mockProducts = [
      {
        id: "prod-1",
        name: "Cà phê Sữa Đá Sài Gòn",
        description: "Cà phê Robusta đậm đà kết hợp sữa đặc thơm béo",
        basePrice: 29000,
        imageUrl: "https://example.com/cf-sua.jpg",
        category: "Cà phê",
        isAvailable: true,
        stockQuantity: 25,
      },
      {
        id: "prod-2",
        name: "Trà Đào Cam Sả",
        description: "Trà thanh nhiệt với đào miếng giòn ngọt",
        basePrice: 35000,
        imageUrl: "",
        category: "Trà",
        isAvailable: false,
        stockQuantity: 0,
      },
    ];

    vi.spyOn(productApi, "getProducts").mockResolvedValue(mockProducts);

    await act(async () => {
      root.render(<MenuPage />);
    });

    expect(container.textContent).toContain("Cà phê Sữa Đá Sài Gòn");
    expect(container.textContent).toContain("29.000đ");
    const selectProductLink = container.querySelector(
      '[data-testid="select-product-prod-1"]'
    ) as HTMLAnchorElement;
    expect(selectProductLink?.getAttribute("href")).toBe("/menu/prod-1");

    // =========================================================================
    // BƯỚC 2: XEM CHI TIẾT & CHỌN TÙY CHỌN SIZE + TOPPING (/menu/prod-1)
    // =========================================================================
    mockRouteParams = { id: "prod-1" };
    vi.spyOn(productApi, "getProductById").mockResolvedValue(mockProducts[0]);
    vi.spyOn(productApi, "getToppings").mockResolvedValue([
      {
        id: "top-pearl",
        name: "Trân châu đường đen dẻo",
        price: 10000,
        isAvailable: true,
      },
      {
        id: "top-cheese",
        name: "Kem Cheese Macchiato",
        price: 12000,
        isAvailable: true,
      },
    ]);

    await act(async () => {
      root.render(<ProductDetailPage />);
    });

    expect(container.textContent).toContain("Cà phê Sữa Đá Sài Gòn");

    // Chọn Size M (+6.000đ)
    const sizeMBtn = container.querySelector(
      '[data-testid="size-option-M"]'
    ) as HTMLButtonElement;
    expect(sizeMBtn).not.toBeNull();
    await act(async () => {
      sizeMBtn.click();
    });

    // Chọn Topping Trân châu (+10.000đ)
    const toppingCheckbox = container.querySelector(
      '[data-testid="topping-option-top-pearl"] input[type="checkbox"]'
    ) as HTMLInputElement;
    expect(toppingCheckbox).not.toBeNull();
    await act(async () => {
      toppingCheckbox.click();
    });

    // Tăng số lượng lên 2 ly -> Đơn giá = 29.000 + 6.000 + 10.000 = 45.000đ -> 2 ly = 90.000đ
    const incQtyBtn = container.querySelector(
      '[data-testid="btn-increase-qty"]'
    ) as HTMLButtonElement;
    await act(async () => {
      incQtyBtn.click();
    });

    expect(
      container.querySelector('[data-testid="configured-total-price"]')
        ?.textContent
    ).toContain("90.000đ");

    // Submit thêm vào giỏ hàng
    const optionForm = container.querySelector(
      '[data-testid="product-option-selector"]'
    ) as HTMLFormElement;
    await act(async () => {
      optionForm.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(
      container.querySelector('[data-testid="detail-cart-count"]')?.textContent
    ).toBe("2");

    // =========================================================================
    // BƯỚC 3: QUẢN LÝ GIỎ HÀNG & TÍNH TỔNG TIỀN (/cart)
    // =========================================================================
    await act(async () => {
      root.render(<CartPage />);
    });

    expect(container.textContent).toContain("Cà phê Sữa Đá Sài Gòn");
    expect(container.textContent).toContain("Size M");
    expect(container.textContent).toContain("Trân châu đường đen dẻo");
    expect(
      container.querySelector('[data-testid="cart-total-count"]')?.textContent
    ).toBe("2 ly");
    expect(
      container.querySelector('[data-testid="cart-subtotal"]')?.textContent
    ).toContain("90.000đ");

    const proceedLink = container.querySelector(
      '[data-testid="proceed-to-checkout-btn"]'
    ) as HTMLAnchorElement;
    expect(proceedLink?.getAttribute("href")).toBe("/checkout");

    // =========================================================================
    // BƯỚC 4: XÁC THỰC ĐĂNG KÝ -> ĐĂNG NHẬP JWT & ĐẶT ĐƠN (/register -> /login -> /checkout)
    // =========================================================================
    // 4.1. Khách hàng vào /register để tạo tài khoản
    mockSearchParamsMap = { redirect: "/checkout" };
    vi.spyOn(authApi, "registerApi").mockResolvedValueOnce({
      accessToken: "reg-token-unused",
      user: {
        id: "user-e2e-1",
        email: "customer.e2e@brewlite.vn",
        loyaltyPoints: 0,
      },
    });

    await act(async () => {
      root.render(<RegisterPage />);
    });

    act(() => {
      setInputValue(
        container.querySelector("#email") as HTMLInputElement,
        "customer.e2e@brewlite.vn"
      );
      setInputValue(
        container.querySelector("#password") as HTMLInputElement,
        "password123"
      );
      setInputValue(
        container.querySelector("#confirmPassword") as HTMLInputElement,
        "password123"
      );
    });

    await act(async () => {
      (
        container.querySelector('button[type="submit"]') as HTMLButtonElement
      ).click();
    });

    // Hệ thống chuyển hướng sang /login?registered=1&email=...&redirect=%2Fcheckout
    expect(mockPush).toHaveBeenCalledWith(
      "/login?registered=1&email=customer.e2e%40brewlite.vn&redirect=%2Fcheckout"
    );

    // 4.2. Khách hàng đăng nhập tại /login để nhận JWT
    mockSearchParamsMap = {
      registered: "1",
      email: "customer.e2e@brewlite.vn",
      redirect: "/checkout",
    };

    vi.spyOn(authApi, "loginApi").mockImplementationOnce(async () => {
      window.localStorage.setItem("accessToken", "jwt-token-e2e-valid");
      return {
        accessToken: "jwt-token-e2e-valid",
        user: {
          id: "user-e2e-1",
          email: "customer.e2e@brewlite.vn",
          loyaltyPoints: 0,
        },
      };
    });

    await act(async () => {
      root.render(<LoginPage />);
    });

    // Hiển thị thông báo xanh xác nhận đăng ký thành công & điền sẵn email
    expect(
      container.querySelector('[data-testid="register-success-alert"]')
    ).not.toBeNull();
    expect(
      (container.querySelector("#email") as HTMLInputElement).value
    ).toBe("customer.e2e@brewlite.vn");

    act(() => {
      setInputValue(
        container.querySelector("#password") as HTMLInputElement,
        "password123"
      );
    });

    await act(async () => {
      (
        container.querySelector('button[type="submit"]') as HTMLButtonElement
      ).click();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe("jwt-token-e2e-valid");
    expect(mockPush).toHaveBeenCalledWith("/checkout");

    // =========================================================================
    // BƯỚC 5: ĐẶT ĐƠN HÀNG & THANH TOÁN QR / IDEMPOTENCY (/checkout)
    // =========================================================================
    // Đồng bộ giỏ hàng từ Zustand vào localStorage cho trang Checkout
    window.localStorage.setItem(
      "brewlite-cart",
      JSON.stringify(
        useCartStore.getState().items.map((item) => ({
          key: item.key,
          productId: item.productId,
          name: item.name,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          size: item.size,
          quantity: item.quantity,
          toppings: item.toppings,
        }))
      )
    );

    vi.spyOn(orderApi, "createOrder").mockResolvedValueOnce({
      id: "ord-e2e-999",
      orderId: "ord-e2e-999",
      userId: "user-e2e-1",
      status: "PENDING",
      subtotal: 90000,
      discountAmount: 10000,
      total: 80000,
      createdAt: new Date().toISOString(),
    });

    vi.spyOn(paymentApi, "getVietQrBankConfig").mockResolvedValue({
      bankId: "MB",
      accountNo: "0000000001",
      accountName: "BrewLite",
      template: "compact2",
      source: "ENV_FALLBACK",
    });

    vi.spyOn(paymentApi, "initiatePayment").mockResolvedValueOnce({
      id: "pay-session-e2e-999",
      orderId: "ord-e2e-999",
      idempotencyKey: "idem-ord-e2e-999-wallet",
      amount: 80000,
      method: "WALLET",
      status: "PENDING",
      orderStatus: "PENDING",
      paymentRef: "BREWORDE2E999",
      qrCodeUrl:
        "https://img.vietqr.io/image/MB-0000000001-compact2.png?amount=80000&addInfo=BREWORDE2E999",
      bankInfo: {
        bankId: "MB",
        accountNo: "0000000001",
        accountName: "BrewLite",
        template: "compact2",
        source: "ENV_FALLBACK",
      },
      loyaltyPointsEarned: 0,
      idempotentReplayed: false,
      createdAt: new Date().toISOString(),
    });

    vi.spyOn(paymentApi, "simulateSepaySandboxWebhook").mockResolvedValueOnce({
      success: true,
      orderId: "ord-e2e-999",
      status: "SUCCEEDED",
      orderStatus: "PAID",
      loyaltyPointsEarned: 8,
    });

    vi.spyOn(paymentApi, "pollOrderPaymentStatus").mockResolvedValueOnce({
      id: "pay-settled-999",
      orderId: "ord-e2e-999",
      idempotencyKey: "idem-ord-e2e-999-wallet",
      amount: 80000,
      method: "WALLET",
      status: "SUCCEEDED",
      orderStatus: "PAID",
      paymentRef: "BREWORDE2E999",
      qrCodeUrl:
        "https://img.vietqr.io/image/MB-0000000001-compact2.png?amount=80000&addInfo=BREWORDE2E999",
      bankInfo: {
        bankId: "MB",
        accountNo: "0000000001",
        accountName: "BrewLite",
        template: "compact2",
        source: "ENV_FALLBACK",
      },
      loyaltyPointsEarned: 8,
      idempotentReplayed: false,
      createdAt: new Date().toISOString(),
    });

    await act(async () => {
      root.render(<CheckoutPage />);
    });

    // Kiểm tra mã QR inline hiển thị trực tiếp trên trang Thanh toán đúng với tài khoản trong file .env
    expect(
      container.querySelector('[data-testid="inline-qr-transfer-box"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="inline-qr-account-no"]')
        ?.textContent
    ).toBe("0000000001");
    expect(
      container.querySelector('[data-testid="inline-qr-account-name"]')
        ?.textContent
    ).toBe("BrewLite");

    // Nhập mã khuyến mãi WELCOME10 (-10.000đ) -> Tổng thanh toán còn 80.000đ
    const promoInput = container.querySelector(
      'input[placeholder*="WELCOME10"]'
    ) as HTMLInputElement;
    expect(promoInput).not.toBeNull();
    act(() => {
      setInputValue(promoInput, "WELCOME10");
    });

    expect(
      container.querySelector('[data-testid="inline-qr-transfer-box"]')
        ?.textContent
    ).toContain("80.000đ");

    // Bấm nút Tạo đơn & Hiển thị mã QR thanh toán
    const submitOrderBtn = container.querySelector(
      '[data-testid="submit-order-btn"]'
    ) as HTMLButtonElement;
    await act(async () => {
      submitOrderBtn.click();
    });

    // Kiểm tra Modal VietQR mở ra kèm mã tham chiếu BREWORDE2E999
    expect(
      container.querySelector('[data-testid="vietqr-payment-modal"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="vietqr-payment-ref"]')?.textContent
    ).toContain("BREWORDE2E999");

    // Khách hàng bấm xác nhận đã chuyển khoản
    const confirmTransferBtn = container.querySelector(
      '[data-testid="simulate-webhook-success-btn"]'
    ) as HTMLButtonElement;
    await act(async () => {
      confirmTransferBtn.click();
    });

    // Hiển thị màn hình xác nhận thanh toán thành công (PAID) và xóa giỏ hàng
    expect(
      container.querySelector('[data-testid="payment-success-banner"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="paid-order-status"]')?.textContent
    ).toBe("PAID");
    expect(window.localStorage.getItem("brewlite-cart")).toBeNull();

    // =========================================================================
    // BƯỚC 6: XÁC NHẬN CHI TIẾT ĐƠN HÀNG (/orders/:id) & LỊCH SỬ ĐƠN (/orders)
    // =========================================================================
    mockRouteParams = { id: "ord-e2e-999" };
    const mockOrderDetail: OrderDetailResponse = {
      id: "ord-e2e-999",
      orderId: "ord-e2e-999",
      userId: "user-e2e-1",
      status: "PAID",
      subtotal: 90000,
      discountAmount: 10000,
      total: 80000,
      orderItems: [
        {
          id: "oi-1",
          productId: "prod-1",
          size: "M",
          quantity: 2,
          lineTotal: 90000,
          product: {
            id: "prod-1",
            name: "Cà phê Sữa Đá Sài Gòn",
            price: 29000,
          },
          toppings: [
            {
              id: "top-pearl",
              name: "Trân châu đường đen dẻo",
              price: 10000,
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(orderApi, "getMyOrder").mockResolvedValueOnce(mockOrderDetail);

    await act(async () => {
      root.render(<OrderDetailPage />);
    });

    expect(container.textContent).toContain("Đơn hàng #ord-e2e-999");
    expect(container.textContent).toContain("Đã thanh toán (Hiện tại)");
    expect(container.textContent).toContain("Cà phê Sữa Đá Sài Gòn");
    expect(container.textContent).toContain("Trân châu đường đen dẻo");
    expect(container.textContent).toContain("Tổng thanh toán: 80.000đ");

    // Kiểm tra trang Lịch sử đơn hàng (/orders)
    vi.spyOn(orderApi, "getMyOrders").mockResolvedValueOnce([
      {
        ...mockOrderDetail,
        itemCount: 2,
      },
    ]);

    await act(async () => {
      root.render(<OrderHistoryPage />);
    });

    expect(container.textContent).toContain("Lịch sử đơn hàng");
    expect(container.textContent).toContain("Đơn hàng #ord-e2e-999");
    expect(container.textContent).toContain("Đã thanh toán");
    expect(container.textContent).toContain("80.000đ");
  });
});
