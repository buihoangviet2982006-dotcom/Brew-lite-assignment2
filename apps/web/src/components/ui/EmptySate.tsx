import React from "react";

interface EmptyStateProps {
  message?: string;
  description?: string;
  onReset?: () => void;
  actionLabel?: string;
}

export function EmptyState({
  message = "Không tìm thấy món phù hợp",
  description = "Hiện tại danh mục này chưa có sản phẩm hoặc không khớp với từ khóa tìm kiếm của bạn.",
  onReset,
  actionLabel = "Xem tất cả thực đơn",
}: EmptyStateProps) {
  return (
    <div
      data-testid="menu-empty"
      style={{
        maxWidth: "420px",
        margin: "32px auto",
        padding: "36px 20px",
        border: "1px dashed #dcd6ce",
        borderRadius: "16px",
        background: "#ffffff",
        textAlign: "center",
        color: "#29251f",
      }}
    >
      <div style={{ fontSize: "42px", marginBottom: "12px" }}>☕</div>
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "18px",
          fontWeight: 700,
          color: "#29251f",
        }}
      >
        {message}
      </h3>
      <p
        style={{
          margin: "0 0 20px",
          fontSize: "14px",
          lineHeight: 1.5,
          color: "#777777",
        }}
      >
        {description}
      </p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          style={{
            minHeight: "42px",
            padding: "10px 22px",
            border: "none",
            borderRadius: "9px",
            background: "#795638",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;