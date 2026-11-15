# Báo Cáo Sprint Review & Sprint Retrospective (Task 5.4)

- **Dự án:** BrewLite – Nền tảng đặt đồ uống không dùng tiền mặt (Assignment 2)
- **Môn học:** Công nghệ Phần mềm – Khoa Công nghệ Thông tin, Trường Đại học Sài Gòn
- **Phạm vi báo cáo:** Sprint 1 (Task 1 – Task 4) và Sprint 2 (Task 5 – Hoàn thiện MVP, Kiểm thử, CI/CD & Bàn giao)
- **Thời điểm tổng kết:** 15/11/2026 (Phiên bản `v1.0.0`)

---

## Phần 1: Sprint Review

### 1.1. Đánh giá Mục tiêu Sprint (Sprint Goal Achievement)

| Sprint | Sprint Goal | Kết quả | Tỷ lệ hoàn thành Backlog |
| :--- | :--- | :---: | :--- |
| **Sprint 1**<br>*(Task 1 – Task 4)* | Tạo nền tảng kỹ thuật Monorepo, hoàn thiện tài liệu có kiểm soát phiên bản qua Pull Request, thiết lập CI Pipeline tự động và hiện thực MVP đầu tiên chạy được cho luồng xem menu. | ✅ **Đạt** | **12/12 Issues (`#S1-01` → `#S1-12`)** — `36/36 Story Points` |
| **Sprint 2**<br>*(Task 5 & Truy vết)* | Hoàn thiện luồng nghiệp vụ End-to-End (Tùy chọn món → Giỏ hàng → JWT → Đặt đơn & Tồn kho → Thanh toán VietQR/Idempotency → Xác nhận & Lịch sử đơn), phủ Unit/Integration/E2E Test, thiết lập CD Pipeline và bàn giao Production. | ✅ **Đạt (chờ gắn URL Production sau khi merge `main`)** | **10/11 Issues Done (`#S2-01` → `#S2-10`)**; `#S2-11` đã hoàn thiện toàn bộ tài liệu bàn giao, còn bước điền URL live & tag `v1.0.0` sau khi merge `main` |

### 1.2. Kết quả Increment & Sản phẩm đã nghiệm thu

1. **Nghiệp vụ End-to-End (Task 5.1 – `FR-01`..`FR-10`):**
   - **Menu & Chi tiết món (`apps/web/src/app/menu`, `menu/[id]`):** Tìm kiếm/lọc theo danh mục, hiển thị 4 trạng thái UI (`Loading Skeleton`, `EmptyState`, `ErrorAlert` + Retry, `Success`), chọn Size (`S`/`M`/`L`), Topping và tính giá động.
   - **Giỏ hàng & Đặt đơn (`apps/web/src/app/cart`, `checkout`, `orders`):** Quản lý giỏ hàng Zustand (`cart.store.ts`), bảo vệ API bằng `JwtAuthGuard`, tính toán và trừ tồn kho nguyên liệu trong `Prisma.$transaction` với Optimistic Locking (`version`), hỗ trợ áp mã giảm giá (`Promotion`) và trả `409 Conflict` khi thiếu hàng.
   - **Thanh toán & Theo dõi (`payments`, `orders`):** Hỗ trợ thanh toán Ví/Thẻ/VietQR qua `SePay Sandbox` & `POST /payments/sepay-webhook/simulate`, chống xử lý trùng lặp bằng `Idempotency-Key`, kiểm soát chuyển trạng thái qua `assertTransition()` và tự động cộng điểm `LoyaltyTransaction`.
2. **Tích hợp & Kiểm thử (Task 5.2):**
   - **Backend (`@brewlite/api` – Jest):** 11 test suites (63 tests) bao gồm unit test (`auth`, `products`, `orders`, `payments`, `health`) và integration test 6 bước (`core-e2e-flow.integration.spec.ts`).
   - **Frontend (`@brewlite/web` – Vitest + Testing Library):** 6 test suites (24 tests) kiểm thử toàn bộ UI component và luồng giao diện.
   - **Playwright E2E (`tests/e2e/order-checkout.spec.ts`):** Đã chạy kiểm thử thực tế trên trình duyệt Chromium (`Pixel 5` mobile viewport) kết nối trực tiếp Web + API + PostgreSQL xuyên suốt từ `/menu` → `/menu/[id]` → `/cart` → `/login` → `/checkout` (VietQR) → `/orders/[id]` (`PAID`), đạt **1/1 PASS (6.1s)**.
   - **Hạ tầng Docker & Health Check:** `docker-compose.yml` khởi chạy đồng bộ 3 services (`postgres`, `api`, `web`), có endpoint `GET /health` (`@nestjs/terminus`), migration chuẩn hóa `20261114163354_init_brewlite_schema` và script `seed.ts` với **15 sản phẩm, 12 nguyên liệu, 6 toppings, 4 mã khuyến mãi**.
3. **Continuous Delivery & Tài liệu (Task 5.3 & Task 5.4):**
   - Pipeline `.github/workflows/cd.yml` tự động chạy chuỗi `Push/Tag (main, v*.*.*) → Quality Gate (Lint/Test/Build) → Build & Tag Docker Image (SHA/SemVer) → Push GHCR → Safe Migration → Deploy Render/Vercel → Smoke Test (/health, /menu) → Dừng & Rollback khi lỗi`.
   - Bộ tài liệu bàn giao đầy đủ: `README.md`, `CHANGELOG.md`, `docs/deployment.md`, `docs/deployment/rollback-strategy.md`, `docs/security-audit.md`, `docs/traceability-matrix.md`.

---

## Phần 2: Sprint Retrospective

### 2.1. Những điểm làm tốt (What Went Well)
- **Kiểm soát phiên bản & Quy trình PR chặt chẽ:** Mọi thay đổi từ tài liệu Task 1–3, tính năng Sprint 1–2 đến cấu hình CI/CD đều đi qua nhánh riêng (`docs/*`, `feat/*`, `ci/*`, `test/*`) và Pull Request vào `develop`, giúp truy vết rõ ràng theo từng Issue.
- **Chất lượng dữ liệu & Xử lý giao dịch an toàn:** Thiết kế bảng `Ingredient` + `RecipeItem` kết hợp `Prisma.$transaction` và `Idempotency-Key` giải quyết triệt để bài toán trừ tồn kho đồng thời và ngăn thanh toán lặp.
- **Tích hợp E2E thực tế thành công:** Kịch bản Playwright E2E đã kiểm chứng được luồng người dùng thật trên mobile viewport kết nối xuyên suốt Frontend Next.js, Backend NestJS và PostgreSQL.

### 2.2. Những vấn đề / Khó khăn gặp phải (What Didn't Go Well)
1. **Trùng lặp Prisma Migration khi làm việc song song:** Nhánh Task 5.2 và nhánh Task 5.3 đều tự chạy `prisma migrate dev` sinh ra hai thư mục migration khởi tạo khác tên (`20261114163354_init_brewlite_schema` và `20261115143000_initial_schema`), suýt gây lỗi trùng bảng nếu merge trực tiếp không rà soát.
2. **Ghi đè cấu hình Workflow CD khi chia nhánh phụ:** Một commit cập nhật bước Deploy Render/Vercel trên nhánh Task 5.3 đã ghi đè mất phần Build/Tag/Push Docker Image trong `cd.yml`, đòi hỏi phải đối chiếu lịch sử Git để ghép lại đầy đủ cả hai luồng.
3. **Xung đột giữa Vitest và Playwright trong cùng workspace:** Khi thêm tệp `apps/web/e2e/smoke-setup.spec.ts`, Vitest mặc định quét toàn bộ file `*.spec.ts` nên bị lỗi cho đến khi bổ sung `exclude: ['e2e/**']` vào `vitest.config.ts`.
4. **Timeout Jest trên môi trường chạy song song nhiều worker:** Suite `core-e2e-flow.integration.spec.ts` (khởi tạo NestJS + `bcrypt`) đôi khi vượt ngưỡng 5.000ms mặc định của Jest nếu máy chạy song song tất cả 11 suites cùng lúc.

### 2.3. Hành động cải tiến (Action Items)
- **[Quy trình Git & Database]:** Thống nhất chỉ một đầu mối khởi tạo hoặc thay đổi `prisma/migrations/`; luôn chạy `git merge origin/develop` để kiểm tra xung đột logic trước khi mở Pull Request.
- **[Cấu hình Test]:** Tách biệt hoàn toàn thư mục E2E (`tests/e2e/`) khỏi unit test (`apps/*/src/`), cấu hình `--runInBand` hoặc tăng timeout cho integration test nặng khi cần thiết.
- **[CI/CD & Vận hành]:** Duy trì nguyên tắc không tự chạy `prisma db push` trên Production; luôn kiểm tra đồng bộ tài liệu (`README.md`, `traceability-matrix.md`) ngay khi hoàn thành tính năng thay vì dồn vào cuối Sprint.
