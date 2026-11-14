"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getMyOrder,
  getStoredAccessToken,
} from "../../../lib/order-api";
import type { OrderDetailResponse } from "../../../types/order";

const statusSteps = [
  { value: "PENDING", label: "Chờ thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "PREPARING", label: "Đang chuẩn bị" },
  { value: "COMPLETED", label: "Hoàn thành" },
];

const statusLabels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Đang chuẩn bị",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Không thể tải chi tiết đơn hàng.";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getStoredAccessToken();

    if (!token) {
      setError("Bạn cần đăng nhập để xem chi tiết đơn hàng.");
      setLoading(false);
      return;
    }

    try {
      const result = await getMyOrder(orderId, token);
      setOrder(result);
    } catch (err) {
      setError(getErrorMessage(err));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const currentStep = statusSteps.findIndex(
    (step) => step.value === order?.status
  );

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "0 20px",
      }}
    >
      <Link href="/orders">← Quay lại lịch sử đơn hàng</Link>

      <h1 style={{ marginTop: "24px" }}>Chi tiết đơn hàng</h1>

      {loading && <p>Đang tải thông tin đơn hàng...</p>}

      {!loading && error && (
        <section
          role="alert"
          style={{
            padding: "20px",
            marginTop: "20px",
            background: "#fff0f0",
            color: "#b42318",
            borderRadius: "8px",
          }}
        >
          <p>{error}</p>

          <button type="button" onClick={() => void loadOrder()}>
            Thử lại
          </button>

          <p>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/orders/${orderId}`)}`}
            >
              Đi tới trang đăng nhập
            </Link>
          </p>
        </section>
      )}

      {!loading && !error && order && (
        <>
          <section
            style={{
              padding: "20px",
              marginTop: "20px",
              border: "1px solid #ddd",
              borderRadius: "12px",
            }}
          >
            <h2>Đơn hàng #{order.orderId}</h2>

            <p>
              Trạng thái:{" "}
              <strong>
                {statusLabels[order.status] ?? order.status}
              </strong>
            </p>

            <p>
              Ngày đặt:{" "}
              {new Date(order.createdAt).toLocaleString("vi-VN")}
            </p>

            <p>
              Cập nhật lần cuối:{" "}
              {new Date(order.updatedAt).toLocaleString("vi-VN")}
            </p>

            <button
              type="button"
              onClick={() => void loadOrder()}
              disabled={loading}
              style={{ padding: "10px 16px", marginTop: "8px" }}
            >
              Cập nhật trạng thái
            </button>
          </section>

          <section
            style={{
              padding: "20px",
              marginTop: "20px",
              border: "1px solid #ddd",
              borderRadius: "12px",
            }}
          >
            <h2>Tiến trình đơn hàng</h2>

            {order.status === "CANCELLED" ? (
              <p style={{ color: "#b42318", fontWeight: "bold" }}>
                Đơn hàng đã bị hủy.
              </p>
            ) : currentStep === -1 ? (
              <p>Trạng thái hiện tại: {order.status}</p>
            ) : (
              <ol style={{ paddingLeft: "24px" }}>
                {statusSteps.map((step, index) => {
                  const completed = index <= currentStep;

                  return (
                    <li
                      key={step.value}
                      style={{
                        padding: "10px 0",
                        color: completed ? "#16803c" : "#888",
                        fontWeight: completed ? "bold" : "normal",
                      }}
                    >
                      {completed ? "✓ " : "○ "}
                      {step.label}
                      {index === currentStep ? " (Hiện tại)" : ""}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section
            style={{
              padding: "20px",
              marginTop: "20px",
              border: "1px solid #ddd",
              borderRadius: "12px",
            }}
          >
            <h2>Sản phẩm trong đơn hàng</h2>

            {order.orderItems.map((item) => (
              <article
                key={item.id}
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <h3>{item.product?.name ?? "Sản phẩm không còn tồn tại"}</h3>

                <p>Kích thước: {item.size}</p>

                <p>Số lượng: {item.quantity}</p>

                {item.toppings.length > 0 && (
                  <p>
                    Topping:{" "}
                    {item.toppings.map((t) => t.name).join(", ")}
                  </p>
                )}

                <strong>
                  {item.lineTotal.toLocaleString("vi-VN")}đ
                </strong>
              </article>
            ))}
          </section>

          <section
            style={{
              padding: "20px",
              marginTop: "20px",
              border: "1px solid #ddd",
              borderRadius: "12px",
            }}
          >
            <h2>Tổng kết đơn hàng</h2>

            <p>
              Tạm tính: {order.subtotal.toLocaleString("vi-VN")}đ
            </p>

            <p>
              Giảm giá: {order.discountAmount.toLocaleString("vi-VN")}đ
            </p>

            <h3>
              Tổng thanh toán: {order.total.toLocaleString("vi-VN")}đ
            </h3>
          </section>
        </>
      )}
    </main>
  );
}