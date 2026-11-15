import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { ProductOptionSelector } from "./menu/ProductOptionSelector";
import { useCartStore } from "../store/cart.store";
import type { ToppingOption } from "../utils/product-options";

const mockApiToppings: ToppingOption[] = [
  { id: "top-uuid-1", name: "Trân châu đường đen dẻo", price: 10000, isAvailable: true },
  { id: "top-uuid-2", name: "Kem Cheese Macchiato béo mặn", price: 12000, isAvailable: true },
  { id: "top-uuid-3", name: "Thạch nha đam giòn thanh", price: 10000, isAvailable: true },
  { id: "top-uuid-4", name: "Sốt Caramel thủ công", price: 8000, isAvailable: true },
];

describe("ProductOptionSelector (FR-02: Size, Topping & Validation)", () => {
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

  it("1. Chọn Size M (+6.000đ), chọn Topping thật từ API, tăng số lượng và thêm vào Zustand Cart Store", async () => {
    await act(async () => {
      root.render(
        <ProductOptionSelector
          productId="prod-uuid-1"
          productName="Cà phê sữa đá BrewLite"
          basePrice={39000}
          stockQuantity={10}
          isAvailable={true}
          availableToppings={mockApiToppings}
        />
      );
    });

    // Chọn Size M (+6.000đ)
    const sizeMBtn = container.querySelector(
      '[data-testid="size-option-M"]'
    ) as HTMLButtonElement;
    await act(async () => {
      sizeMBtn.click();
    });

    // Chọn Topping 1 (+10.000đ)
    const topping1Checkbox = container.querySelector(
      '[data-testid="topping-option-top-uuid-1"] input[type="checkbox"]'
    ) as HTMLInputElement;
    await act(async () => {
      topping1Checkbox.click();
    });

    // Tăng số lượng lên 2
    const increaseBtn = container.querySelector(
      '[data-testid="btn-increase-qty"]'
    ) as HTMLButtonElement;
    await act(async () => {
      increaseBtn.click();
    });

    // Đơn giá = 39.000 + 6.000 + 10.000 = 55.000đ -> Tổng 2 ly = 110.000đ
    const totalEl = container.querySelector(
      '[data-testid="configured-total-price"]'
    );
    expect(totalEl?.textContent).toContain("110.000đ");

    // Submit thêm vào giỏ
    const form = container.querySelector(
      '[data-testid="product-option-selector"]'
    ) as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe("prod-uuid-1");
    expect(items[0].size).toBe("M");
    expect(items[0].sizeExtraPrice).toBe(6000);
    expect(items[0].quantity).toBe(2);
    expect(items[0].toppings).toEqual([
      { id: "top-uuid-1", name: "Trân châu đường đen dẻo", price: 10000 },
    ]);

    expect(
      container.querySelector('[data-testid="go-to-cart-link"]')?.getAttribute("href")
    ).toBe("/cart");
  });

  it("2. Báo lỗi validation và vô hiệu hóa nút thêm giỏ nếu chọn quá 3 loại Topping", async () => {
    await act(async () => {
      root.render(
        <ProductOptionSelector
          productId="prod-uuid-1"
          productName="Cà phê sữa đá BrewLite"
          basePrice={39000}
          stockQuantity={10}
          isAvailable={true}
          availableToppings={mockApiToppings}
        />
      );
    });

    for (const tid of ["top-uuid-1", "top-uuid-2", "top-uuid-3", "top-uuid-4"]) {
      const cb = container.querySelector(
        `[data-testid="topping-option-${tid}"] input[type="checkbox"]`
      ) as HTMLInputElement;
      await act(async () => {
        cb.click();
      });
    }

    const errEl = container.querySelector(
      '[data-testid="topping-validation-error"]'
    );
    expect(errEl).not.toBeNull();
    expect(errEl?.textContent).toContain("tối đa 3 loại topping");

    const submitBtn = container.querySelector(
      '[data-testid="btn-add-to-cart"]'
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });
});
