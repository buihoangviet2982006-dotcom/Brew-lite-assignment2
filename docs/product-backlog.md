# Product Backlog & Issue Board – Sprint 1 và Sprint 2 (Task 4.1)

- **Dự án:** BrewLite – Nền tảng đặt đồ uống không dùng tiền mặt (Assignment 2)
- **Môn học:** Công nghệ Phần mềm – Khoa Công nghệ Thông tin, Trường Đại học Sài Gòn
- **Phương pháp quản lý:** Scrum kết hợp bảng Kanban (Issue Board: `Backlog` $\rightarrow$ `To Do` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`)
- **Quy mô ước lượng:** Story Points theo dãy Fibonacci ($1, 2, 3, 5, 8$) và phân loại ưu tiên theo **MoSCoW** (`Must`, `Should`, `Could`, `Won't`).

---

## 1. Tổng Quan Product Backlog Toàn Dự Án

Bảng dưới đây tổng hợp toàn bộ các Epics và Product Backlog Items (PBIs) của hệ thống **BrewLite**, liên kết chặt chẽ với các mã yêu cầu trong [`docs/requirements/srs.md`](./requirements/srs.md) và 5 Task của đề bài Assignment 2:

| Mã Backlog | Epic / Nhóm công việc | Tên User Story / Hạng mục kỹ thuật | Mã FR / NFR liên kết | Ưu tiên (MoSCoW) | Story Points | Phân bổ Sprint |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **BL-01** | Yêu cầu & Phân tích | Phân tích bối cảnh, Stakeholder, phạm vi In/Out-of-scope, giả định, ràng buộc & rủi ro (Task 1.1) | Toàn cục | **Must** | 2 | **Sprint 1** |
| **BL-02** | Yêu cầu & Phân tích | Xây dựng SRS rút gọn (`FR-01`..`FR-10`, `NFR-01`..`NFR-03`) và Use-case tổng quát (Task 1.2) | `FR-01`..`FR-10`<br>`NFR-01`..`NFR-03` | **Must** | 3 | **Sprint 1** |
| **BL-03** | Yêu cầu & Phân tích | Đặc tả chi tiết Use-case trọng tâm: Đặt và thanh toán đơn hàng (Task 1.3) | `FR-03`..`FR-07` | **Must** | 3 | **Sprint 1** |
| **BL-04** | Mô hình hóa UML | Thiết kế Activity Diagram, Sequence Diagram và Domain Class Diagram (Task 2.1 – 2.3) | `FR-01`..`FR-10` | **Must** | 5 | **Sprint 1** |
| **BL-05** | Kiến trúc hệ thống | Thiết kế kiến trúc C4/Layered, viết bộ ADR `001`–`004` và UML Deployment Diagram (Task 3.1 – 3.2) | `NFR-01`..`NFR-03` | **Must** | 5 | **Sprint 1** |
| **BL-06** | Hạ tầng & Quy trình | Thiết lập Monorepo (`apps/web`, `apps/api`, `docs`), README, Branch/PR/Commit/DoD & Backlog (Task 4.1 – 4.2) | Quy trình | **Must** | 3 | **Sprint 1** |
| **BL-07** | Thực đơn (Catalog) | **US-01:** Thiết kế CSDL Prisma (`Product`, `Ingredient`), seed dữ liệu mẫu & API `GET /products`, `GET /products/:id` (Task 4.3) | `FR-01`, `FR-02`<br>`NFR-01` | **Must** | 5 | **Sprint 1** |
| **BL-08** | Thực đơn (Catalog) | **US-02:** Giao diện Menu Mobile-First bằng Next.js với 4 trạng thái (`loading`, `empty`, `error`, `success`), lọc & tìm kiếm (Task 4.3) | `FR-01`<br>`NFR-03` | **Must** | 5 | **Sprint 1** |
| **BL-09** | Kiểm thử & CI | Xây dựng Unit/Integration/Component Test cho MVP Sprint 1 và thiết lập CI Pipeline tự động trên PR (Task 4.3 – 4.4) | `FR-01`, `FR-02` | **Must** | 5 | **Sprint 1** |
| **BL-10** | Thực đơn (Catalog) | **US-03:** Màn hình chi tiết sản phẩm, tùy chọn kích cỡ Size (S/M/L), thêm Topping và tính giá động (Task 5.1) | `FR-02`<br>`NFR-03` | **Must** | 5 | **Sprint 2** |
| **BL-11** | Giỏ hàng (Cart) | **US-04:** Quản lý giỏ hàng phía Client (Zustand): thêm, tăng/giảm số lượng, xóa món và tính tổng tiền tức thì (Task 5.1) | `FR-03`<br>`NFR-03` | **Must** | 5 | **Sprint 2** |
| **BL-12** | Xác thực (Auth) | **US-05:** Đăng ký (`POST /auth/register`), Đăng nhập (`POST /auth/login`), băm `bcrypt` và bảo vệ route bằng JWT (Task 5.1) | `FR-04`<br>`NFR-02` | **Must** | 5 | **Sprint 2** |
| **BL-13** | Đặt hàng (Order) | **US-06:** Tạo đơn hàng (`POST /orders`), validate DTO, thực thi Prisma Transaction kiểm tra và trừ tồn kho (Task 5.1) | `FR-05`<br>`NFR-01`, `NFR-02` | **Must** | 8 | **Sprint 2** |
| **BL-14** | Thanh toán (Payment)| **US-07:** Thanh toán không tiền mặt (`POST /payments`: Ví/Thẻ mô phỏng & VietQR/SePay) có hỗ trợ `Idempotency-Key` (Task 5.1) | `FR-06`<br>`NFR-02` | **Must** | 8 | **Sprint 2** |
| **BL-15** | Theo dõi đơn (Order)| **US-08:** Màn hình xác nhận đơn hàng, xem lịch sử đơn (`GET /orders/me`) và kiểm soát luồng trạng thái `assertTransition` (Task 5.1) | `FR-07`, `FR-08` | **Must** | 5 | **Sprint 2** |
| **BL-16** | Khuyến mãi & Điểm | **US-09:** Áp dụng mã giảm giá (`Promotion`) khi checkout và tự động cộng điểm thưởng (`LoyaltyTransaction`) khi hoàn tất (Task 5.1) | `FR-09`, `FR-10` | **Should** | 5 | **Sprint 2** |
| **BL-17** | Kiểm thử & Docker | Viết Unit/Integration test cho đặt đơn/thanh toán, E2E test (Playwright), hoàn thiện `docker-compose.yml` & `GET /health` (Task 5.2) | `FR-01`..`FR-08`<br>`NFR-01`..`NFR-03` | **Must** | 8 | **Sprint 2** |
| **BL-18** | CI/CD & Bàn giao | Thiết lập CD Pipeline (Docker Image, Registry, Deploy Production HTTPS, Migration, Smoke Test, Rollback) & Bàn giao (Task 5.3 – 5.4) | Toàn hệ thống | **Must** | 8 | **Sprint 2** |

---

## 2. Issue Board & Sprint Backlog – SPRINT 1 (Task 1 – Task 4)

> **Sprint 1 Goal:** *"Tạo nền tảng kỹ thuật Monorepo, hoàn thiện bộ tài liệu yêu cầu – mô hình hóa UML – kiến trúc có kiểm soát phiên bản qua Pull Request, thiết lập CI Pipeline tự động và hiện thực MVP đầu tiên chạy được cho luồng xem menu."*
> - **Tổng số Issues:** 12 Issues (`#S1-01` $\rightarrow$ `#S1-12`)
> - **Tổng Story Points Sprint 1:** 36 Points

### 2.1. Tổng Quan Trạng Thái Issue Board – Sprint 1 (Kanban View)

| 📋 To Do | 🔄 In Progress | 👀 In Review (PR / CI Gate) | ✅ Done (Merged to `develop`) |
| :--- | :--- | :--- | :--- |
| *(Không còn mục tồn đọng)* | *(Không còn mục đang làm)* | • **#S1-08**: Thiết lập Monorepo, README, Workflow, Backlog (`docs/task-4.1-repo-setup`) | • **#S1-01**: Bối cảnh, Stakeholder & Phạm vi (`PR #4`)<br>• **#S1-02**: SRS rút gọn & Use-case tổng quát (`PR #4`)<br>• **#S1-03**: Đặc tả Use-case Đặt & thanh toán (`PR #4`)<br>• **#S1-04**: Activity & Sequence Diagram (`PR #5`)<br>• **#S1-05**: Domain Class Diagram (`PR #5`)<br>• **#S1-06**: Kiến trúc C4/Layered & ADR 001–004 (`PR #6`)<br>• **#S1-07**: UML Deployment Diagram (`PR #6`)<br>• **#S1-09**: Prisma Schema, Migration & Seed (`PR #8`)<br>• **#S1-10**: API `GET /products` & `GET /products/:id` (`PR #8`)<br>• **#S1-11**: UI Menu Mobile-First & Unit/Component Tests (`PR #7`)<br>• **#S1-12**: Thiết lập GitHub Actions CI Pipeline (`PR #9`) |

### 2.2. Bảng Chi Tiết Các Hạng Mục Sprint 1

| Mã Issue | Hạng mục / User Story | Mã Yêu cầu | Nhánh Git & Pull Request | Tạo phẩm / Tệp đầu ra chính | Story Points | Trạng thái |
| :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **#S1-01** | **[Task 1.1]** Phân tích bối cảnh nghiệp vụ, bảng 6 Stakeholder, phạm vi In/Out-of-scope, giả định, ràng buộc & rủi ro | Toàn cục | `docs/task-1-requirements`<br>(Merged `PR #4`) | [`docs/requirements/context-and-scope.md`](./requirements/context-and-scope.md) | 2 | ✅ **Done** |
| **#S1-02** | **[Task 1.2]** Xây dựng tài liệu SRS rút gọn (`FR-01`..`FR-10`, `NFR-01`..`NFR-03`) và vẽ sơ đồ Use-case tổng quát | `FR-01`..`FR-10`<br>`NFR-01`..`NFR-03` | `docs/task-1-requirements`<br>(Merged `PR #4`) | [`docs/requirements/srs.md`](./requirements/srs.md)<br>[`docs/diagrams/usecase-general.svg`](./diagrams/usecase-general.svg) | 3 | ✅ **Done** |
| **#S1-03** | **[Task 1.3]** Đặc tả chi tiết Use-case trọng tâm "Đặt và thanh toán đơn hàng" kèm sơ đồ Use-case phạm vi | `FR-03`..`FR-07` | `docs/task-1-requirements`<br>(Merged `PR #4`) | [`docs/requirements/use-case-checkout.md`](./requirements/use-case-checkout.md)<br>[`docs/diagrams/usecase-checkout.svg`](./diagrams/usecase-checkout.svg) | 3 | ✅ **Done** |
| **#S1-04** | **[Task 2.1 & 2.2]** Vẽ Activity Diagram luồng End-to-End và Sequence Diagram cho Use-case Đặt & thanh toán đơn | `FR-01`..`FR-07` | `docs/task-2-uml-diagrams`<br>(Merged `PR #5`) | [`docs/diagrams/activity-checkout.svg`](./diagrams/activity-checkout.svg)<br>[`docs/diagrams/sequence-checkout.svg`](./diagrams/sequence-checkout.svg) | 3 | ✅ **Done** |
| **#S1-05** | **[Task 2.3]** Vẽ Domain Class Diagram cho 7 lớp cốt lõi (`User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`) | `FR-01`..`FR-10` | `docs/task-2-uml-diagrams`<br>(Merged `PR #5`) | [`docs/diagrams/class-diagram.puml`](./diagrams/class-diagram.puml)<br>[`docs/diagrams/class-diagram.svg`](./diagrams/class-diagram.svg) | 2 | ✅ **Done** |
| **#S1-06** | **[Task 3.1]** Thiết kế kiến trúc tổng thể C4/Layered và lập 4 bản ghi quyết định kiến trúc (ADR 001 – ADR 004) | `NFR-01`..`NFR-03` | `docs/task-3-architecture`<br>(Merged `PR #6`) | [`docs/architecture/overview.md`](./architecture/overview.md)<br>[`docs/architecture/adr/`](./architecture/adr/) | 3 | ✅ **Done** |
| **#S1-07** | **[Task 3.2]** Vẽ UML Deployment Diagram cho môi trường Local, CI và Production (Railway & Cloudflare) | `NFR-01`..`NFR-03` | `docs/task-3-architecture`<br>(Merged `PR #6`) | [`docs/diagrams/deployment.puml`](./diagrams/deployment.puml)<br>[`docs/diagrams/Deployment.svg`](./diagrams/Deployment.svg) | 2 | ✅ **Done** |
| **#S1-08** | **[Task 4.1 & 4.2]** Thiết lập cấu trúc Monorepo, `.gitignore`, `.env.example`, `README.md`, quy ước Branch/PR/Commit/DoD và Product Backlog | Quy trình | `docs/task-4.1-repo-setup` | [`README.md`](../README.md)<br>[`docs/development-workflow.md`](./development-workflow.md)<br>[`docs/product-backlog.md`](./product-backlog.md) | 3 | ✅ **Done** |
| **#S1-09** | **[Task 4.3]** Thiết lập PostgreSQL (`docker-compose.yml`), Prisma Schema (`Product`, `Ingredient`, `RecipeItem`) và script `seed.ts` | `FR-01`, `FR-02` | `feat/task4.3-api-products`<br>(Merged `PR #8`) | `apps/api/prisma/schema.prisma`<br>`apps/api/prisma/seed.ts`<br>[`docker-compose.yml`](../docker-compose.yml) | 3 | ✅ **Done** |
| **#S1-10** | **[Task 4.3]** Hiện thực Backend API `GET /products` và `GET /products/:id` kèm tính toán trạng thái tồn kho từ nguyên liệu | `FR-01`, `FR-02`<br>`NFR-01` | `feat/task4.3-api-products`<br>(Merged `PR #8`) | `apps/api/src/modules/products/products.controller.ts`<br>`apps/api/src/modules/products/products.service.ts` | 4 | ✅ **Done** |
| **#S1-11** | **[Task 4.3]** Hiện thực màn hình Menu Mobile-First (`apps/web`), xử lý trạng thái `loading`/`empty`/`error` và viết 21 Unit/Integration/Component Tests | `FR-01`<br>`NFR-03` | `feat/task4.3-menu-ui`<br>(Merged `PR #7`) | `apps/web/src/app/menu/page.tsx`<br>`apps/web/src/components/Menu.spec.tsx`<br>[`docs/traceability-matrix.md`](./traceability-matrix.md) | 5 | ✅ **Done** |
| **#S1-12** | **[Task 4.4]** Thiết lập pipeline Continuous Integration (`.github/workflows/ci.yml`): `Install -> Lint -> Unit Test -> Build` khi mở PR | Quy trình CI | `ci/setup-github-actions`<br>(Merged `PR #9`) | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)<br>[`docs/ci-evidence.md`](./ci-evidence.md) | 3 | ✅ **Done** |

---

## 3. Issue Board & Sprint Backlog – SPRINT 2 (Task 5 – Hoàn thiện MVP, CI/CD & Delivery)

> **Sprint 2 Goal:** *"Hoàn thiện toàn bộ luồng nghiệp vụ End-to-End (Chi tiết món/Size/Topping $\rightarrow$ Giỏ hàng $\rightarrow$ Đăng ký/Đăng nhập JWT $\rightarrow$ Đặt đơn & Trừ tồn kho $\rightarrow$ Thanh toán Ví/Thẻ/VietQR có Idempotency $\rightarrow$ Xác nhận & Lịch sử đơn), phủ đầy đủ Unit/Integration/E2E Test, thiết lập Continuous Delivery (CD) và triển khai phiên bản Production hoạt động qua HTTPS."*
> - **Tổng số Issues:** 11 Issues (`#S2-01` $\rightarrow$ `#S2-11`)
> - **Tổng Story Points Sprint 2:** 53 Points

### 3.1. Tổng Quan Trạng Thái Issue Board – Sprint 2 (Kanban View)

| 📋 To Do (Sprint 2 Backlog) | 🔄 In Progress | 👀 In Review | ✅ Done |
| :--- | :--- | :--- | :--- |
| • **#S2-01**: Chi tiết sản phẩm, chọn Size (S/M/L) & Topping (`FR-02`)<br>• **#S2-02**: Giỏ hàng Client & tính tổng tiền tự động (`FR-03`)<br>• **#S2-03**: Đăng ký, Đăng nhập `bcrypt` & bảo vệ JWT (`FR-04`)<br>• **#S2-04**: API Tạo đơn hàng & Transaction trừ tồn kho (`FR-05`)<br>• **#S2-05**: Thanh toán Ví/Thẻ mô phỏng + VietQR & `Idempotency-Key` (`FR-06`)<br>• **#S2-06**: Xác nhận đơn, Lịch sử đơn (`GET /orders/me`) & State Machine (`FR-07`, `FR-08`)<br>• **#S2-07**: Khuyến mãi (`Promotion`) & Tích điểm (`LoyaltyTransaction`) (`FR-09`, `FR-10`)<br>• **#S2-08**: Unit, Integration & E2E Test (Playwright) luồng End-to-End (Task 5.2)<br>• **#S2-09**: Hoàn thiện `docker-compose.yml` (Web + API + DB) & `GET /health` (Task 5.2)<br>• **#S2-10**: Thiết lập CD Pipeline & Deploy Production HTTPS (Task 5.3)<br>• **#S2-11**: Bàn giao Production, Release Notes, Rollback, Demo & Retrospective (Task 5.4) | *(Sẵn sàng khởi chạy ngay sau khi nghiệm thu Sprint 1)* | - | - |

### 3.2. Bảng Chi Tiết Các User Stories & Hạng Mục Kỹ Thuật Sprint 2

| Mã Issue | Tên User Story / Hạng mục (Task 5) | Mã Yêu cầu | Nhánh Git dự kiến | Tiêu chí chấp nhận & Đầu ra kiểm chứng (Acceptance Criteria) | Ưu tiên | Story Points |
| :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **#S2-01** | **[Task 5.1] US-03:** Xem chi tiết sản phẩm, tùy chọn kích cỡ (Size S/M/L) và thêm Topping | `FR-02`<br>`NFR-03` | `feat/task5.1-product-detail` | - Màn hình `/menu/[id]` gọi `GET /products/:id` hiển thị thông tin món.<br>- Cho phép chọn Size (S/M/L) và nhiều Topping.<br>- Công thức tính giá động $\text{UnitPrice} = \text{BasePrice} + \text{SizeExtra} + \sum \text{ToppingPrice}$ cập nhật tức thì trên UI. | **Must** | 5 |
| **#S2-02** | **[Task 5.1] US-04:** Quản lý giỏ hàng (thêm, sửa số lượng, xóa món) và tự động tính tổng tiền | `FR-03`<br>`NFR-03` | `feat/task5.1-cart-store` | - Quản lý state bằng Zustand (`cart.store.ts`) đồng bộ `localStorage`.<br>- Thay đổi số lượng hoặc xóa món cập nhật ngay tổng tiền tạm tính.<br>- Badge trên thanh điều hướng hiển thị đúng tổng số món trong giỏ. | **Must** | 5 |
| **#S2-03** | **[Task 5.1] US-05:** Đăng ký, đăng nhập tài khoản và xác thực bằng JWT | `FR-04`<br>`NFR-02` | `feat/task5.1-auth-jwt` | - `POST /auth/register`: Validate email, mật khẩu $\ge 6$ ký tự, băm mật khẩu bằng `bcrypt` ($\text{salt rounds} \ge 10$).<br>- `POST /auth/login`: Trả về `accessToken` (JWT) khi hợp lệ hoặc `401 Unauthorized` khi sai.<br>- Bảo vệ route `/checkout` và `/orders` trên cả Frontend & Backend (`JwtAuthGuard`). | **Must** | 5 |
| **#S2-04** | **[Task 5.1] US-06:** Đặt đơn hàng mới và kiểm soát tồn kho đồng thời bằng Transaction | `FR-05`<br>`NFR-01`<br>`NFR-02` | `feat/task5.1-create-order` | - `POST /orders` yêu cầu Bearer JWT và validate DTO qua `ValidationPipe`.<br>- Thực thi `Prisma.$transaction` kiểm tra và trừ tồn kho; trả lỗi `409 Conflict` nếu hết hàng.<br>- Khởi tạo đơn ở trạng thái `PENDING` và tính lại tổng tiền độc lập tại Server. | **Must** | 8 |
| **#S2-05** | **[Task 5.1] US-07:** Thanh toán Ví/Thẻ mô phỏng & VietQR có hỗ trợ `Idempotency-Key` | `FR-06`<br>`NFR-02` | `feat/task5.1-payment-service` | - `POST /payments` nhận `orderId`, `method` (`WALLET`/`CARD`/`VIETQR`) và header `Idempotency-Key`.<br>- Thành công: chuyển đơn sang `PAID`; Thất bại: chuyển sang `PAYMENT_FAILED`, giữ giỏ hàng để thử lại.<br>- Gửi lặp 2 request cùng `Idempotency-Key` chỉ xử lý giao dịch đúng 1 lần duy nhất. | **Must** | 8 |
| **#S2-06** | **[Task 5.1] US-08:** Màn hình xác nhận đơn, xem lịch sử đơn và kiểm soát State Machine trạng thái | `FR-07`<br>`FR-08` | `feat/task5.1-order-history` | - Hiển thị màn hình Xác nhận gồm Mã đơn (`#id`), Tổng tiền, Trạng thái `PAID`.<br>- `GET /orders/me` trả về danh sách đơn của user đang đăng nhập (mới nhất lên đầu).<br>- Hàm `assertTransition` chặn mọi chuyển trạng thái bất hợp lệ (ném `400 Bad Request`). | **Must** | 5 |
| **#S2-07** | **[Task 5.1] US-09:** Áp dụng mã khuyến mãi (`Promotion`) và tích điểm thưởng (`LoyaltyTransaction`) | `FR-09`<br>`FR-10` | `feat/task5.1-promo-loyalty` | - Kiểm tra mã voucher hợp lệ, trừ chiết khấu vào tổng đơn trước thanh toán.<br>- Tự động ghi nhận `LoyaltyTransaction` và cộng điểm khi đơn chuyển sang `COMPLETED`. | **Should** | 5 |
| **#S2-08** | **[Task 5.2]** Kiểm thử Unit, Integration cho API Đặt đơn/Thanh toán và End-to-End Test (Playwright) | `FR-01`..`FR-08` | `test/task5.2-integration-e2e` | - Unit test cho tính giá, kiểm tra tồn kho, `assertTransition`.<br>- Integration test cho `POST /orders` và `POST /payments` (kể cả Idempotency & hết hàng).<br>- Tối thiểu 01 E2E test (`tests/e2e/`) chạy xuyên suốt từ Xem menu $\rightarrow$ Xác nhận đơn. | **Must** | 5 |
| **#S2-09** | **[Task 5.2]** Hoàn thiện `docker-compose.yml` chạy đồng bộ Web + API + DB ở local và endpoint `GET /health` | `NFR-01`..`NFR-03` | `ci/task5.2-docker-health` | - Endpoint `GET /health` kiểm tra tiến trình API và kết nối PostgreSQL.<br>- Lệnh `docker-compose up` khởi chạy thành công cả 3 container (`web`, `api`, `postgres`) kèm migration/seed. | **Must** | 3 |
| **#S2-10** | **[Task 5.3]** Xây dựng Pipeline Continuous Delivery (`.github/workflows/cd.yml`) và triển khai Production | Toàn hệ thống | `ci/task5.3-cd-pipeline` | - Pipeline tự động: `Push/Tag -> Lint & Test -> Build -> Docker Image (SHA/SemVer) -> Push Registry -> Deploy Production -> Safe Migration -> Smoke Test (/health)`.<br>- Tự động dừng pipeline và hỗ trợ rollback khi smoke test thất bại. | **Must** | 2 |
| **#S2-11** | **[Task 5.4 & Task 8]** Hoàn thiện tài liệu triển khai, Ma trận truy vết đầy đủ, Release Notes, Video Demo & Sprint Retrospective | Toàn hệ thống | `docs/task5.4-delivery-handover`| - Cung cấp URL Frontend Production (HTTPS) & URL API Health Check.<br>- Hoàn thiện [`docs/deployment.md`](./deployment.md) và [`docs/traceability-matrix.md`](./traceability-matrix.md).<br>- Tạo Release tag, Video Demo End-to-End và báo cáo Sprint Review & Retrospective. | **Must** | 2 |

