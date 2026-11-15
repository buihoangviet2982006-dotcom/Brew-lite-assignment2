import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import CartPage from "../app/cart/page";
import { useCartStore } from "../store/cart.store";

describe("CartPage (/cart - FR-03: Quản lý giỏ hàng tách riêng)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    useCartStore.getState().clearCart();
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

  it("1. Hiển thị trạng thái giỏ hàng trống khi chưa có món", async () => {
    await act(async () => {
      root.render(<CartPage />);
    });

    const emptyBox = container.querySelector('[data-testid="cart-empty"]');
    expect(emptyBox).not.toBeNull();
    expect(emptyBox?.textContent).toContain("Giỏ hàng của bạn đang trống");
  });

  it("2. Hiển thị món kèm Size/Topping/Ghi chú, cho phép tăng giảm số lượng, xóa món và tính tổng tiền chính xác", async () => {
    useCartStore.getState().addItem({
      productId: "prod-1",
      name: "Cà phê sữa đá BrewLite",
      basePrice: 39000,
      size: "L",
      sizeExtraPrice: 10000,
      quantity: 1,
      toppings: [{ id: "top-1", name: "Trân châu đường đen dẻo", price: 10000 }],
      note: "Ít đá",
      maxStock: 10,
    });

    await act(async () => {
      root.render(<CartPage />);
    });

    // Đơn giá = 39.000 + 10.000 (Size L) + 10.000 (Topping) = 59.000đ
    expect(container.textContent).toContain("Cà phê sữa đá BrewLite");
    expect(container.textContent).toContain("Size L");
    expect(container.textContent).toContain("Trân châu đường đen dẻo");
    expect(container.textContent).toContain("Ít đá");
    expect(
      container.querySelector('[data-testid="cart-subtotal"]')?.textContent
    ).toContain("59.000đ");

    // Tăng số lượng lên 2 -> 118.000đ
    const incBtn = container.querySelector(
      '[aria-label="Tăng số lượng Cà phê sữa đá BrewLite"]'
    ) as HTMLButtonElement;
    await act(async () => {
      incBtn.click();
    });

    expect(
      container.querySelector('[data-testid="cart-total-count"]')?.textContent
    ).toBe("2 ly");
    expect(
      container.querySelector('[data-testid="cart-subtotal"]')?.textContent
    ).toContain("118.000đ");

    // Kiểm tra nút chuyển sang /checkout
    const checkoutLink = container.querySelector(
      '[data-testid="proceed-to-checkout-btn"]'
    ) as HTMLAnchorElement;
    expect(checkoutLink?.getAttribute("href")).toBe("/checkout");

    // Xóa món khỏi giỏ -> về trạng thái trống
    const removeBtn = container.querySelector(
      '[aria-label="Xóa Cà phê sữa đá BrewLite khỏi giỏ hàng"]'
    ) as HTMLButtonElement;
    await act(async () => {
      removeBtn.click();
    });

    expect(container.querySelector('[data-testid="cart-empty"]')).not.toBeNull();
  });
});
