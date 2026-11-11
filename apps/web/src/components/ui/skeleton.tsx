// apps/web/src/components/ui/Skeleton.tsx
import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      role="status"
      data-testid="loading-spinner"
      className="flex flex-col items-center justify-center gap-2"
    >
      <div
        className={`${sizeClasses[size]} border-amber-500 border-t-transparent rounded-full animate-spin`}
      />
      {label && <span className="text-xs font-medium text-gray-500">{label}</span>}
    </div>
  );
};

interface MenuSkeletonProps {
  count?: number;
}

export const MenuSkeleton: React.FC<MenuSkeletonProps> = ({ count = 5 }) => {
  return (
    <div
      data-testid="menu-loading-skeleton"
      aria-busy="true"
      aria-label="Đang tải danh sách thực đơn"
      className="w-full max-w-md mx-auto px-4 py-3 space-y-4"
    >
      {/* Skeleton Thanh tìm kiếm */}
      <div className="h-11 bg-gray-200 rounded-xl w-full animate-pulse" />

      {/* Skeleton Thanh chọn danh mục (Category Pills) */}
      <div className="flex gap-2 overflow-x-hidden py-1">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="h-9 w-24 bg-gray-200 rounded-full shrink-0 animate-pulse"
          />
        ))}
      </div>

      {/* Skeleton Danh sách món (Product Cards) */}
      <div className="grid grid-cols-1 gap-3 pt-1">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3.5 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse"
          >
            {/* Khung ảnh */}
            <div className="w-24 h-24 bg-gray-200 rounded-xl shrink-0" />

            {/* Khung thông tin món */}
            <div className="flex-1 space-y-2.5 py-1">
              <div className="h-4 bg-gray-200 rounded-md w-3/4" />
              <div className="h-3 bg-gray-100 rounded-md w-full" />
              <div className="h-3 bg-gray-100 rounded-md w-2/3" />

              <div className="flex items-center justify-between pt-2">
                <div className="h-5 bg-amber-100 rounded-md w-20" />
                <div className="h-8 w-20 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};