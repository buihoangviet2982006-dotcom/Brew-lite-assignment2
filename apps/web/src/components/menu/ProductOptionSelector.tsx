"use client";

import React, { useMemo, useState } from "react";
import {
  MAX_NOTE_LENGTH,
  MAX_TOPPINGS_PER_ITEM,
  PRODUCT_SIZES,
  PRODUCT_TOPPINGS,
  calculateConfiguredTotalPrice,
  calculateConfiguredUnitPrice,
  validateProductOptions,
} from "../../utils/product-options.ts";
import type {
  SelectedProductOptions,
  SizeOption,
  ToppingOption,
} from "../../utils/product-options.ts";

interface ProductOptionSelectorProps {
  productId: string;
  productName: string;
  basePrice: number;
  imageUrl?: string;
  stockQuantity?: number;
  isAvailable?: boolean;
  onConfirmAdd?: (selection: SelectedProductOptions) => void;
}

export function ProductOptionSelector({
  productId,
  productName,
  basePrice,
  imageUrl,
  stockQuantity = 20,
  isAvailable = true,
  onConfirmAdd,
}: ProductOptionSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<SizeOption>(PRODUCT_SIZES[0]);
  const [selectedToppings, setSelectedToppings] = useState<ToppingOption[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  const validation = useMemo(
    () =>
      validateProductOptions({
        size: selectedSize,
        toppings: selectedToppings,
        quantity,
        note,
        maxStock: stockQuantity,
      }),
    [selectedSize, selectedToppings, quantity, note, stockQuantity]
  );

  const unitPrice = useMemo(
    () => calculateConfiguredUnitPrice(basePrice, selectedSize, selectedToppings),
    [basePrice, selectedSize, selectedToppings]
  );

  const totalPrice = useMemo(
    () =>
      calculateConfiguredTotalPrice(
        basePrice,
        selectedSize,
        selectedToppings,
        quantity
      ),
    [basePrice, selectedSize, selectedToppings, quantity]
  );

  const handleToggleTopping = (topping: ToppingOption) => {
    setFeedbackMessage("");
    const exists = selectedToppings.some((item) => item.id === topping.id);
    if (exists) {
      setSelectedToppings((prev) =>
        prev.filter((item) => item.id !== topping.id)
      );
      return;
    }

    setSelectedToppings((prev) => [...prev, topping]);
  };

  const handleQuantityChange = (nextQty: number) => {
    setFeedbackMessage("");
    const maxAllowed = Math.min(20, Math.max(1, stockQuantity));
    if (nextQty < 1) {
      setQuantity(1);
    } else if (nextQty > maxAllowed) {
      setQuantity(maxAllowed);
    } else {
      setQuantity(nextQty);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validation.isValid || !isAvailable) return;

    const payload: SelectedProductOptions = {
      productId,
      productName,
      basePrice,
      imageUrl,
      size: selectedSize,
      toppings: selectedToppings,
      quantity,
      note: note.trim(),
      unitPrice,
      totalPrice,
    };

    // Lưu tương thích vào localStorage để bên Giỏ hàng (nếu có) tự đọc được mà không cần import chéo
    if (typeof window !== "undefined") {
      try {
        const rawCart = window.localStorage.getItem("brewlite_cart_v1");
        const parsed = rawCart ? JSON.parse(rawCart) : { items: [] };
        const currentItems = Array.isArray(parsed.items) ? parsed.items : [];
        const sortedIds = [...selectedToppings]
          .map((t) => t.id)
          .sort()
          .join(",");
        const cartItemId = `${productId}__${selectedSize.code}__${sortedIds}`;

        const existingIdx = currentItems.findIndex(
          (i: { cartItemId?: string }) => i.cartItemId === cartItemId
        );

        if (existingIdx > -1) {
          currentItems[existingIdx].quantity += quantity;
        } else {
          currentItems.push({
            cartItemId,
            productId,
            name: productName,
            imageUrl,
            basePrice,
            size: { name: selectedSize.code, extraPrice: selectedSize.extraPrice },
            toppings: selectedToppings.map((t) => ({
              id: t.id,
              name: t.name,
              price: t.price,
            })),
            quantity,
            note: note.trim(),
          });
        }

        window.localStorage.setItem(
          "brewlite_cart_v1",
          JSON.stringify({ ...parsed, items: currentItems })
        );
        window.dispatchEvent(new Event("brewlite-cart-updated"));
      } catch {
        // Bỏ qua nếu trình duyệt chặn localStorage
      }
    }

    if (onConfirmAdd) {
      onConfirmAdd(payload);
    }

    setFeedbackMessage(
      `Đã thêm ${quantity} ly ${productName} (Size ${selectedSize.code}) vào giỏ hàng!`
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="product-option-selector"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "20px",
        borderRadius: "16px",
        border: "1px solid #eee9e2",
        background: "#ffffff",
      }}
    >
      {/* 1. Chọn Kích cỡ (Size - Bắt buộc) */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
            1. Chọn kích cỡ (Size) <span style={{ color: "#c0392b" }}>*</span>
          </h3>
          <span
            style={{
              fontSize: "12px",
              padding: "3px 8px",
              borderRadius: "12px",
              background: "#f4efe8",
              color: "#795638",
              fontWeight: 600,
            }}
          >
            Bắt buộc chọn 1
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "10px",
          }}
        >
          {PRODUCT_SIZES.map((size) => {
            const isSelected = selectedSize.code === size.code;
            return (
              <button
                key={size.code}
                type="button"
                data-testid={`size-option-${size.code}`}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedSize(size);
                  setFeedbackMessage("");
                }}
                style={{
                  minHeight: "54px",
                  padding: "10px 8px",
                  borderRadius: "12px",
                  border: `2px solid ${isSelected ? "#795638" : "#e3ded6"}`,
                  background: isSelected ? "#795638" : "#faf9f6",
                  color: isSelected ? "#ffffff" : "#29251f",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  cursor: "pointer",
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                <span style={{ fontSize: "14px" }}>{size.label}</span>
                <span
                  style={{
                    fontSize: "12px",
                    opacity: isSelected ? 0.9 : 0.75,
                  }}
                >
                  {size.extraPrice > 0
                    ? `+${size.extraPrice.toLocaleString("vi-VN")}đ`
                    : "+0đ"}
                </span>
              </button>
            );
          })}
        </div>

        {validation.errors.size && (
          <p
            role="alert"
            style={{ margin: "6px 0 0", fontSize: "13px", color: "#c0392b" }}
          >
            {validation.errors.size}
          </p>
        )}
      </section>

      {/* 2. Chọn Topping (Tùy chọn nhiều) */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
            2. Thêm Topping đi kèm
          </h3>
          <span style={{ fontSize: "12px", color: "#777" }}>
            Tối đa {MAX_TOPPINGS_PER_ITEM} loại (Đã chọn:{" "}
            {selectedToppings.length}/{MAX_TOPPINGS_PER_ITEM})
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {PRODUCT_TOPPINGS.map((topping) => {
            const isChecked = selectedToppings.some((t) => t.id === topping.id);
            return (
              <label
                key={topping.id}
                data-testid={`topping-option-${topping.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: "46px",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: `1px solid ${isChecked ? "#795638" : "#e3ded6"}`,
                  background: isChecked ? "#fdfaf5" : "#ffffff",
                  cursor: topping.isAvailable ? "pointer" : "not-allowed",
                  opacity: topping.isAvailable ? 1 : 0.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!topping.isAvailable}
                    onChange={() => handleToggleTopping(topping)}
                    style={{ width: "18px", height: "18px", accentColor: "#795638" }}
                  />
                  <span style={{ fontSize: "14px", fontWeight: isChecked ? 700 : 500 }}>
                    {topping.name}
                  </span>
                </div>

                <span style={{ fontSize: "14px", fontWeight: 600, color: "#795638" }}>
                  +{topping.price.toLocaleString("vi-VN")}đ
                </span>
              </label>
            );
          })}
        </div>

        {validation.errors.toppings && (
          <p
            role="alert"
            data-testid="topping-validation-error"
            style={{
              margin: "8px 0 0",
              fontSize: "13px",
              color: "#c0392b",
              fontWeight: 600,
            }}
          >
            ⚠️ {validation.errors.toppings}
          </p>
        )}
      </section>

      {/* 3. Ghi chú thêm (Đá / Đường) */}
      <section>
        <label
          htmlFor="product-note"
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "15px",
            fontWeight: 700,
          }}
        >
          3. Ghi chú cho nhân viên pha chế
        </label>
        <input
          id="product-note"
          type="text"
          placeholder="Ví dụ: Ít đá, 50% đường, để riêng topping..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          data-testid="product-note-input"
          style={{
            width: "100%",
            minHeight: "42px",
            padding: "0 12px",
            borderRadius: "10px",
            border: "1px solid #e3ded6",
            fontSize: "14px",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "4px",
            fontSize: "12px",
            color: note.length > MAX_NOTE_LENGTH ? "#c0392b" : "#888",
          }}
        >
          <span>{validation.errors.note || "Tùy chọn lượng đá / ngọt"}</span>
          <span>
            {note.length}/{MAX_NOTE_LENGTH}
          </span>
        </div>
      </section>

      {/* 4. Chọn Số lượng & Tổng cộng */}
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          paddingTop: "14px",
          borderTop: "1px solid #eee9e2",
        }}
      >
        <div>
          <span style={{ fontSize: "13px", color: "#777", display: "block" }}>
            Đơn giá đã cấu hình: {unitPrice.toLocaleString("vi-VN")}đ / ly
          </span>
          <strong
            data-testid="configured-total-price"
            style={{ fontSize: "20px", color: "#795638", fontWeight: 800 }}
          >
            Tổng: {totalPrice.toLocaleString("vi-VN")}đ
          </strong>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid #e3ded6",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity - 1)}
            aria-label="Giảm số lượng"
            data-testid="btn-decrease-qty"
            style={{
              width: "42px",
              height: "42px",
              border: "none",
              background: "#f7f4ef",
              fontSize: "18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            −
          </button>
          <span
            data-testid="selected-qty-value"
            style={{
              minWidth: "42px",
              textAlign: "center",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity + 1)}
            aria-label="Tăng số lượng"
            data-testid="btn-increase-qty"
            style={{
              width: "42px",
              height: "42px",
              border: "none",
              background: "#f7f4ef",
              fontSize: "18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            +
          </button>
        </div>
      </section>

      {validation.errors.quantity && (
        <p role="alert" style={{ margin: 0, fontSize: "13px", color: "#c0392b" }}>
          {validation.errors.quantity}
        </p>
      )}

      {/* Nút Xác nhận thêm món */}
      <button
        type="submit"
        disabled={!validation.isValid || !isAvailable}
        data-testid="btn-add-to-cart"
        style={{
          width: "100%",
          minHeight: "48px",
          border: "none",
          borderRadius: "12px",
          background:
            !validation.isValid || !isAvailable ? "#cccccc" : "#795638",
          color: "#ffffff",
          fontSize: "16px",
          fontWeight: 700,
          cursor:
            !validation.isValid || !isAvailable ? "not-allowed" : "pointer",
        }}
      >
        {!isAvailable
          ? "Sản phẩm tạm hết hàng"
          : `Thêm vào giỏ hàng • ${totalPrice.toLocaleString("vi-VN")}đ`}
      </button>

      {feedbackMessage && (
        <div
          role="status"
          data-testid="add-to-cart-feedback"
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#edf7ed",
            color: "#1e6b24",
            fontSize: "14px",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          ✅ {feedbackMessage}
        </div>
      )}
    </form>
  );
}

export default ProductOptionSelector;