# Changelog & Release Notes — BrewLite

Mọi thay đổi đáng chú ý của dự án **BrewLite** đều được ghi nhận tại tài liệu này theo chuẩn [Semantic Versioning](https://semver.org/lang/vi/).

---

## [v1.0.0] - 2026-11-15 — Phát hành chính thức MVP (Sprint 1 & Sprint 2)

### Tổng quan bản phát hành
Phiên bản **BrewLite `v1.0.0`** hoàn thiện trọn vẹn quy trình đặt thức uống Mobile-First / PWA từ khâu duyệt thực đơn, tùy chọn món, quản lý giỏ hàng, đặt đơn kiểm soát tồn kho đồng thời (ACID Transaction & Optimistic Locking) đến thanh toán không tiền mặt có chống trùng lặp (`Idempotency-Key`), kiểm thử End-to-End tự động và pipeline CI/CD Container.

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
- **Thanh toán Ví/Thẻ/VietQR & Theo dõi đơn hàng (`FR-06`, `FR-07`, `FR-08`, `FR-10`):**
  - Sinh mã VietQR động kèm đối soát SePay Sandbox & chống trùng lặp giao dịch qua `Idempotency-Key`.
  - Kiểm soát chặt chẽ vòng đời trạng thái đơn hàng (`PENDING` → `PAID` → `PREPARING` → `COMPLETED` / `PAYMENT_FAILED` / `CANCELLED`), xem lịch sử đơn (`/orders`, `/orders/[id]`) và cộng điểm thưởng `LoyaltyTransaction`.

### Hạ tầng, Kiểm thử & CI/CD (DevOps & Quality Gate)
- **Cơ sở dữ liệu, Migration & Seed phong phú:** Hoàn thiện lược đồ PostgreSQL 10 bảng qua Prisma ORM kèm baseline SQL Migration (`20261114163354_init_brewlite_schema`) và dữ liệu mẫu gồm **15 sản phẩm, 12 nguyên liệu, 6 toppings, 4 mã khuyến mãi và 4 tài khoản kiểm thử**.
- **Giám sát hệ thống (`GET /health`):** Tích hợp `@nestjs/terminus` kiểm tra sức khỏe tiến trình API và kết nối thực tế tới PostgreSQL phục vụ Docker Healthcheck và Smoke Test.
- **Kiểm thử toàn diện (Unit, Integration & Playwright E2E):**
  - Hoàn thiện 11 test suites Backend (`Jest`), 6 test suites Frontend (`Vitest`) và kịch bản Playwright E2E thật ([`tests/e2e/order-checkout.spec.ts`](./tests/e2e/order-checkout.spec.ts)) chạy xuyên suốt từ `/menu` đến xác nhận đơn `PAID`.
- **Container hóa & Docker Compose:** `docker-compose.yml` khởi chạy đồng bộ cả 3 dịch vụ `postgres`, `api` và `web`; Multi-stage `Dockerfile` tối ưu trên `node:20-alpine` với non-root user.
- **Pipeline CI/CD & Rollback (`.github/workflows/cd.yml`, `cd-rollback-guard.yml`):** Tự động hóa chuỗi `Push/Tag (main, v*.*.*) → Quality Gate (Lint/Test/Build) → Docker Image (SHA/SemVer) → Push GHCR → Safe Migration → Deploy Render/Vercel → Smoke Test (/health, /menu) → Dừng & Rollback khi lỗi`.

### Bảo mật & Tài liệu bàn giao (Security & Handover)
- Hoàn tất rà soát bảo mật Repository & CI/CD Logs ([`docs/security-audit.md`](./docs/security-audit.md)).
- Cập nhật đầy đủ [`README.md`](./README.md), [`docs/deployment.md`](./docs/deployment.md), [`docs/deployment/rollback-strategy.md`](./docs/deployment/rollback-strategy.md), [`docs/traceability-matrix.md`](./docs/traceability-matrix.md) và [`docs/sprint-review-retrospective.md`](./docs/sprint-review-retrospective.md).
