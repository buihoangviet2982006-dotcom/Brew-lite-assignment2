import React from 'react';

interface ErrorAlertProps {
  title?: string;
  errorMessage: string;
  statusCode?: number;
  isRetrying?: boolean;
  onRetry: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'Không thể tải thực đơn',
  errorMessage,
  statusCode,
  isRetrying = false,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      data-testid="menu-error-alert"
      className="p-6 mx-4 my-6 bg-red-50/90 border border-red-200 rounded-2xl text-center max-w-md md:mx-auto shadow-sm"
    >
      {/* Icon Cảnh báo lỗi */}
      <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-base font-bold text-red-900">{title}</h3>

      {statusCode && (
        <span className="inline-block mt-1 px-2.5 py-0.5 text-[11px] font-semibold bg-red-200 text-red-800 rounded-full">
          Mã lỗi HTTP: {statusCode}
        </span>
      )}

      <p
        data-testid="error-message-text"
        className="text-xs text-red-700 mt-2 mb-5 leading-relaxed"
      >
        {errorMessage}
      </p>

      <button
        type="button"
        data-testid="btn-retry-menu"
        disabled={isRetrying}
        onClick={onRetry}
        className="min-h-[44px] w-full max-w-[200px] inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
      >
        {isRetrying ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Đang kết nối lại...</span>
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Thử lại ngay</span>
          </>
        )}
      </button>
    </div>
  );
};