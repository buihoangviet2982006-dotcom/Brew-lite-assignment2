import React from "react";

interface MenuSkeletonProps {
  count?: number;
}

export function MenuSkeleton({ count = 6 }: MenuSkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes brewlitePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .brewlite-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        @media (min-width: 640px) {
          .brewlite-skeleton-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
          }
        }
        @media (min-width: 1024px) {
          .brewlite-skeleton-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>

      <div
        className="brewlite-skeleton-grid"
        data-testid="menu-loading"
        aria-busy="true"
        aria-label="Đang tải danh sách thực đơn"
      >
        {Array.from({ length: count }).map((_, index) => (
          <article
            key={index}
            className="product-card"
            style={{ animation: "brewlitePulse 1.5s ease-in-out infinite" }}
          >
            <div
              className="product-image"
              style={{ background: "#e6dfd5" }}
            />
            <div className="product-info">
              <div
                style={{
                  height: "16px",
                  width: "75%",
                  marginBottom: "10px",
                  borderRadius: "6px",
                  background: "#e6dfd5",
                }}
              />
              <div
                style={{
                  height: "12px",
                  width: "90%",
                  marginBottom: "6px",
                  borderRadius: "6px",
                  background: "#f0e9df",
                }}
              />
              <div
                style={{
                  height: "12px",
                  width: "55%",
                  marginBottom: "14px",
                  borderRadius: "6px",
                  background: "#f0e9df",
                }}
              />
              <div className="product-bottom">
                <div
                  style={{
                    height: "16px",
                    width: "65px",
                    borderRadius: "6px",
                    background: "#e6dfd5",
                  }}
                />
                <div
                  style={{
                    height: "42px",
                    minWidth: "88px",
                    borderRadius: "9px",
                    background: "#e6dfd5",
                  }}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export default MenuSkeleton;