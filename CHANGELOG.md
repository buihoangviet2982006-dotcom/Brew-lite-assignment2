# Changelog & Release Notes — BrewLite

Mọi thay đổi đáng chú ý của dự án **BrewLite** đều được ghi nhận tại tài liệu này theo chuẩn [Semantic Versioning](https://semver.org/lang/vi/).

---

## [v1.0.0] - 2026-11-15 — Phát hành chính thức MVP (Sprint 1 & Sprint 2)

### Tổng quan bản phát hành
Phiên bản **BrewLite `v1.0.0`** hoàn thiện trọn vẹn quy trình đặt thức uống Mobile-First / PWA từ khâu duyệt thực đơn, tùy chọn món, quản lý giỏ hàng, đặt đơn kiểm soát tồn kho đồng thời (ACID Transaction & Optimistic Locking) đến thanh toán không tiền mặt có chống trùng lặp (Idempotency) và triển khai tự động qua CI/CD Container.

### Tính năng mới (Features)
- **Thực đơn & Chi tiết thức uống (`FR-01`, `FR-02`):**
  - Hiển thị danh sách sản phẩm từ `GET /products`, tính toán tự động số lượng ly tối đa có thể phục vụ dựa trên định mức nguyên liệu tồn kho (`RecipeItem` & `Ingredient`).
  - Xem chi tiết món (`GET /products/:id`), tùy chọn kích cỡ (`S`, `M`, `L`) và kết hợp các loại Topping đi kèm.
  - Hỗ trợ tìm kiếm theo từ khóa tiếng Việt, lọc theo danh mục và xử lý đầy đủ 4 trạng thái giao diện (`Loading Skeleton`, `Empty`, `Error + Retry`, `Success`).
- **Giỏ hàng thông minh (`FR-03`):**
  - Thêm, tăng/giảm số lượng, xóa món và tự động đồng bộ tổng tiền tạm tính tức thời phía Client (`/cart`).
- **Xác thực & Bảo mật tài khoản (`FR-04`, `NFR-02`):**
  - Đăng ký, đăng nhập người dùng với mật khẩu băm `bcrypt` và bảo vệ các API/Route đặt hàng bằng Bearer `JWT`.
- **Đặt đơn hàng, Khuyến mãi & Chống bán vượt tồn kho (`FR-05`, `FR-09`):**
  - API `POST /orders` và giao diện `/checkout` thực thi trong `prisma.$transaction` kết hợp **Optimistic Locking** (`version`) để khấu trừ nguyên liệu chính xác, hỗ trợ áp mã giảm giá (`Promotion`) và tự động Rollback trả mã `409 Conflict` khi hết hàng.
- **Thanh toán Ví/Thẻ & Theo dõi đơn hàng (`FR-06`, `FR-07`, `FR-08`):**
  - Xử lý thanh toán không tiền mặt kèm cơ chế `Idempotency-Key` chống trừ tiền trùng lặp khi mạng chập chờn.
  - Kiểm soát chặt chẽ vòng đời trạng thái đơn hàng (`PENDING` → `PAID` → `PREPARING` → `COMPLETED` / `PAYMENT_FAILED` / `CANCELLED`) và xem lịch sử đơn cá nhân (`/orders`).

### Hạ tầng, Kiểm thử & CI/CD (DevOps & Quality Gate)
- **Cơ sở dữ liệu & Migration:** Hoàn thiện lược đồ PostgreSQL 10 bảng qua Prisma ORM kèm baseline SQL Migration và script tái tạo dữ liệu mẫu tự động (`db:reset`, `db:setup`).
- **Giám sát hệ thống (`GET /health`):** Tích hợp `@nestjs/terminus` kiểm tra sức khỏe tiến trình API và kết nối thực tế tới PostgreSQL phục vụ Docker Healthcheck và Smoke Test.
- **Container hóa tối ưu:** Đóng gói Multi-stage `Dockerfile` trên nền `node:20-alpine` với non-root user (`brewlite-api` ~108MB nén, `brewlite-web` standalone ~59MB nén).
- **Pipeline CI/CD:** Tự động hóa kiểm tra chất lượng (`Lint` → `Unit/Integration Test` → `Build`), đóng gói gắn tag Docker Image theo Commit SHA & Semantic Version (`v1.0.0`), triển khai tự động và hỗ trợ Rollback an toàn.

### Bảo mật (Security)
- Hoàn tất rà soát bảo mật toàn bộ Repository, `.gitignore`, `.dockerignore` và nhật ký GitHub Actions (`docs/security-audit.md`), đảm bảo không rò rỉ khóa bí mật (`Secret` / `.env`) trong mã nguồn và log CI/CD.