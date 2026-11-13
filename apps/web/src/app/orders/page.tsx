"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getMyOrders,
  getStoredAccessToken,
} from "../../lib/order-api";
import type { OrderHistoryItem } from "../../types/order";

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

  return "Không thể tải lịch sử đơn hàng. Vui lòng thử lại.";
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getStoredAccessToken();

    if (!token) {
      setError("Bạn cần đăng nhập để xem lịch sử đơn hàng.");
      setLoading(false);
      return;
    }

    try {
      const result = await getMyOrders(token);
      setOrders(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "0 20px",
      }}
    >
      <Link href="/menu">← Quay lại thực đơn</Link>

      <h1 style={{ marginTop: "24px" }}>Lịch sử đơn hàng</h1>

      <p>Theo dõi các đơn hàng bạn đã đặt tại BrewLite.</p>

      <button
        type="button"
        onClick={() => void loadOrders()}
        disabled={loading}
        style={{ padding: "10px 16px", margin: "12px 0 24px" }}
      >
        {loading ? "Đang tải..." : "Làm mới"}
      </button>

      {loading && <p>Đang tải lịch sử đơn hàng...</p>}

      {!loading && error && (
        <section
          role="alert"
          style={{
            padding: "16px",
            background: "#fff0f0",
            color: "#b42318",
            borderRadius: "8px",
          }}
        >
          <p>{error}</p>

          <button type="button" onClick={() => void loadOrders()}>
            Thử lại
          </button>

          <p>
            <Link href="/login?redirect=/orders">
              Đi tới trang đăng nhập
            </Link>
          </p>
        </section>
      )}

      {!loading && !error && orders.length === 0 && (
        <section
          style={{
            padding: "32px",
            textAlign: "center",
            background: "#f7f7f7",
            borderRadius: "12px",
          }}
        >
          <h2>Bạn chưa có đơn hàng nào</h2>
          <p>Hãy chọn món yêu thích trong thực đơn của BrewLite.</p>
          <Link href="/menu">Khám phá thực đơn</Link>
        </section>
      )}

      {!loading &&
        !error &&
        orders.map((order) => (
          <article
            key={order.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <strong>Đơn hàng #{order.orderId}</strong>

              <strong>
                {statusLabels[order.status] ?? order.status}
              </strong>
            </div>

            <p>
              Ngày đặt:{" "}
              {new Date(order.createdAt).toLocaleString("vi-VN")}
            </p>

            <p>
              Số lượng sản phẩm:{" "}
              {order.itemCount ??
                order.orderItems.reduce(
                  (sum, item) => sum + item.quantity,
                  0
                )}
            </p>

            <p>
              Tổng tiền:{" "}
              <strong>
                {order.total.toLocaleString("vi-VN")}đ
              </strong>
            </p>

            <Link
              href={`/orders/${encodeURIComponent(order.id)}`}
              style={{
                display: "inline-block",
                marginTop: "8px",
                padding: "10px 16px",
                background: "#222",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              Xem chi tiết đơn hàng
            </Link>
          </article>
        ))}
    </main>
  );
}