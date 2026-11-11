import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  isFiltered?: boolean;
  onResetFilter?: () => void;
  onRefresh?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  isFiltered = false,
  onResetFilter,
  onRefresh,
}) => {
  const displayTitle =
    title || (isFiltered ? 'Không tìm thấy món phù hợp' : 'Thực đơn đang trống');
  const displayDesc =
    description ||
    (isFiltered
      ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục hiện tại.'
      : 'Hiện tại cửa hàng chưa cập nhật danh sách đồ uống. Vui lòng quay lại sau ít phút!');

  return (
    <div
      data-testid="menu-empty-state"
      className="flex flex-col items-center justify-center px-6 py-12 my-4 mx-4 bg-white border border-dashed border-gray-200 rounded-2xl text-center max-w-md md:mx-auto"
    >
      {/* Biểu tượng ly cà phê trống */}
      <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-amber-50 text-amber-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zm4-7v3m4-3v3m4-3v3"
          />
        </svg>
      </div>

      <h3 className="text-base font-bold text-gray-800 mb-1.5">{displayTitle}</h3>
      <p className="text-xs text-gray-500 leading-relaxed max-w-xs mb-6">
        {displayDesc}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        {isFiltered && onResetFilter && (
          <button
            type="button"
            data-testid="btn-reset-filter"
            onClick={onResetFilter}
            className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition shadow-sm"
          >
            Xem tất cả món
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            data-testid="btn-refresh-empty"
            onClick={onRefresh}
            className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 active:scale-95 rounded-xl transition"
          >
            Tải lại thực đơn
          </button>
        )}
      </div>
    </div>
  );
};