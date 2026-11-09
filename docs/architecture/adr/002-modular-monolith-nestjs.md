# ADR 002: Áp dụng kiến trúc Modular Monolith trên nền NestJS

* **Trạng thái:** Đã chấp nhận (Accepted)
* **Ngày quyết định:** 2026-11-09
* **Người tham gia:** Bùi Hoàng Việt, Đinh Đào Thái Sơn

## 1. Bối cảnh (Context)
Hệ thống backend của BrewLite cần xử lý nhiều miền nghiệp vụ: Xem thực đơn (`Catalog`), Xác thực (`Auth`), Đặt đơn hàng (`Order`), Thanh toán (`Payment`), và Giám sát (`Health`). Nếu triển khai theo mô hình Microservices ngay từ đầu sẽ gây áp lực lớn về hạ tầng mạng, quản lý distributed transaction và độ trễ giao tiếp giữa các dịch vụ.

## 2. Quyết định (Decision)
Xây dựng ứng dụng `apps/api` theo kiến trúc **Modular Monolith** bằng framework **NestJS**:
- Hệ thống được phân chia thành các Domain Module độc lập: `AuthModule`, `CatalogModule`, `OrderModule`, `PaymentModule`, `HealthModule`.
- Mỗi module tuân thủ kiến trúc phân lớp: Controller (tiếp nhận HTTP, validate DTO) $\rightarrow$ Service (xử lý logic nghiệp vụ, quản lý transaction) $\rightarrow$ Repository/Prisma (truy xuất database).
- Các module giao tiếp với nhau trực tiếp qua In-process Method Call (Dependency Injection), không gọi qua HTTP nội bộ.

## 3. Các phương án đã cân nhắc (Alternatives Considered)
- **Microservices:** Đòi hỏi cấu hình Service Discovery, API Gateway, Distributed Tracing và xử lý giao dịch phân tán (Saga/2PC), vượt quá phạm vi và thời gian 2 Sprint của dự án.
- **Traditional Monolith (Layered thuần túy, không chia module):** Dễ biến mã nguồn thành "Spaghetti code", khó phân công công việc song song giữa các thành viên.

## 4. Hệ quả & Đánh đổi (Consequences)
* **Tích cực:**
  - Đảm bảo tính toàn vẹn dữ liệu (ACID) bằng cách dùng trực tiếp Local Database Transaction khi tạo đơn và trừ kho.
  - Tốc độ thực thi cao, không tốn chi phí network latency giữa các module.
  - Đóng gói đơn giản thành 1 Docker container duy nhất khi deploy.
* **Đánh đổi / Hạn chế:** Cần kỷ luật nghiêm ngặt trong nhóm để không import vòng (circular dependency) giữa các module; toàn bộ hệ thống chạy chung một Node.js process.