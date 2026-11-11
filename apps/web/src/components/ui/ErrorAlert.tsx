import React from "react";

interface ErrorAlertProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorAlert({
  message = "Không thể kết nối đến máy chủ để tải thực đơn. Vui lòng kiểm tra mạng và thử lại.",
  onRetry,
  isRetrying = false,
}: ErrorAlertProps) {
  return (
    <div
      role="alert"
      data-testid="menu-error"
      style={{
        maxWidth: "420px",
        margin: "32px auto",
        padding: "36px 20px",
        border: "1px solid #f5c6cb",
        borderRadius: "16px",
        background: "#fff8f8",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "42px", marginBottom: "12px" }}>⚠️</div>
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "18px",
          fontWeight: 700,
          color: "#c0392b",
        }}
      >
        Đã xảy ra lỗi tải dữ liệu
      </h3>
      <p
        style={{
          margin: "0 0 20px",
          fontSize: "14px",
          lineHeight: 1.5,
          color: "#777777",
        }}
      >
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          disabled={isRetrying}
          onClick={onRetry}
          style={{
            minHeight: "42px",
            padding: "10px 22px",
            border: "none",
            borderRadius: "9px",
            background: "#c0392b",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            opacity: isRetrying ? 0.6 : 1,
            cursor: isRetrying ? "not-allowed" : "pointer",
          }}
        >
          {isRetrying ? "Đang thử lại..." : "Thử lại ngay"}
        </button>
      )}
    </div>
  );
}

export default ErrorAlert;