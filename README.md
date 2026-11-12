# ☕ BrewLite – Nền Tảng Đặt Đồ Uống Không Dùng Tiền Mặt (Assignment 2)

> **Môn học:** Công nghệ Phần mềm (Software Engineering) – Khoa Công nghệ Thông tin, Trường Đại học Sài Gòn  
> **Đề tài:** BrewLite – Requirements to Deployment (Ver 1.0)  
> **Công nghệ cốt lõi:** Next.js 14 (Mobile-First / PWA), NestJS 10 (Modular Monolith), PostgreSQL 16 (Prisma ORM) & Docker

---

## 📌 1. Tổng Quan Dự Án & Phạm Vi Sản Phẩm

**BrewLite** là ứng dụng đặt đồ uống trực tuyến tại quầy (Pick-up / Take-away) theo hướng **Mobile-First / Progressive Web App (PWA)**, giúp giải quyết tình trạng ùn tắc giờ cao điểm, loại bỏ sai sót khi ghi nhận tùy chọn món (Size, Topping) và chuẩn hóa thanh toán không tiền mặt có kiểm soát chống trùng lặp giao dịch (`Idempotency`).

### Luồng nghiệp vụ End-to-End tối thiểu:
$$\text{Xem menu} \longrightarrow \text{Chọn tùy chọn (Size, Topping)} \longrightarrow \text{Giỏ hàng} \longrightarrow \text{Đặt đơn} \longrightarrow \text{Thanh toán} \longrightarrow \text{Theo dõi đơn}$$

### Kiến trúc & Công nghệ sử dụng:
| Tầng hệ thống | Công nghệ & Thư viện chính | Vai trò trong dự án |
| :--- | :--- | :--- |
| **Frontend (`apps/web`)** | **Next.js 14** (App Router), React 18, TypeScript, Tailwind CSS, Zustand, `@ducanh2912/next-pwa` | Giao diện người dùng Mobile-First/PWA, xử lý 4 trạng thái chuẩn (`loading`, `empty`, `error`, `success`), quản lý giỏ hàng & tích hợp API. |
| **Backend (`apps/api`)** | **NestJS 10**, TypeScript, Prisma ORM, Passport-JWT, `bcrypt`, `class-validator`, `@nestjs/terminus` | Cung cấp RESTful API theo kiến trúc Modular Monolith, xác thực JWT, kiểm soát tồn kho qua Database Transaction, xử lý thanh toán & Health Check (`/health`). |
| **Database** | **PostgreSQL 16** (Docker Container) & Prisma Migrate | Lưu trữ dữ liệu quan hệ bền vững (`User`, `Product`, `Ingredient`, `RecipeItem`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`). |
| **Kiểm thử & CI/CD** | **Jest** & **Supertest** (Backend), **Vitest** & **React Testing Library** (Frontend), **Playwright** (E2E), **GitHub Actions** | Tự động hóa kiểm tra chất lượng (`Install → Lint → Unit Test → Build`) và đóng gói/triển khai container. |

---

## 📂 2. Cấu Trúc Kho Mã Nguồn (Monorepo Structure)

Dự án được tổ chức theo cấu trúc **NPM Workspaces Monorepo** tuân thủ mục **6.1 (Task 4.1)** và **mục 9 (Cấu trúc repository)** của đề bài:

```text
brewlite/
├── apps/
│   ├── web/                                    # Next.js 14 Mobile-First / PWA Frontend (Port 3000)
│   │   ├── src/app/                            # App Router (/menu, /cart, /checkout, /orders, /login...)
│   │   ├── src/components/                     # UI Components (ProductCard, MenuSkeleton, EmptyState, ErrorAlert...)
│   │   └── package.json
│   └── api/                                    # NestJS 10 Modular Monolith Backend (Port 4000)
│       ├── prisma/                             # schema.prisma, migrations/ & seed.ts
│       ├── src/modules/                        # Domain Modules (products, auth, orders, payments, health)
│       └── package.json
├── docs/                                       # Toàn bộ tài liệu kiểm soát phiên bản (Task 1 – Task 4)
│   ├── requirements/                           # [Task 1] Bối cảnh, Stakeholder, SRS & Đặc tả Use-case
│   │   ├── context-and-scope.md                # Task 1.1 – Bối cảnh, Stakeholder, In/Out-of-scope, Giả định & Ràng buộc
│   │   ├── srs.md                              # Task 1.2 – Yêu cầu FR-01..FR-10, NFR-01..NFR-03 (MoSCoW)
│   │   └── use-case-checkout.md                # Task 1.3 – Đặc tả Use-case trọng tâm: Đặt và thanh toán đơn hàng
│   ├── diagrams/                               # [Task 2 & 3] Mã nguồn PlantUML (.puml) và ảnh kết xuất (.svg)
│   │   ├── usecase-general.puml / .svg         # Sơ đồ Use-case tổng quát toàn hệ thống
│   │   ├── usecase-checkout.puml / .svg        # Sơ đồ Use-case Đặt và thanh toán đơn hàng
│   │   ├── activity-checkout.puml / .svg       # Task 2.1 – Activity Diagram luồng End-to-End
│   │   ├── sequence-checkout.puml / .svg       # Task 2.2 – Sequence Diagram Đặt và thanh toán đơn hàng
│   │   ├── class-diagram.puml / .svg           # Task 2.3 – Domain Class Diagram
│   │   └── deployment.puml / Deployment.svg    # Task 3.2 – UML Deployment Diagram
│   ├── architecture/                           # [Task 3] Thiết kế kiến trúc & Quyết định kiến trúc (ADR)
│   │   ├── overview.md                         # Task 3.1 – Mô tả kiến trúc C4, Layered Architecture & Observability
│   │   └── adr/                                # Architecture Decision Records (001 đến 004)
│   ├── development-workflow.md                 # [Task 4.1] Chiến lược Branch, PR, Quy ước Commit & Definition of Done
│   ├── product-backlog.md                      # [Task 4.1] Product Backlog & Issue Board cho Sprint 1 và Sprint 2
│   ├── ci-evidence.md                          # [Task 4.4] Minh chứng triển khai Continuous Integration (CI)
│   ├── traceability-matrix.md                  # [Task 8.1] Ma trận truy vết Yêu cầu ↔ Thiết kế ↔ Code/API ↔ Test
│   └── deployment.md                           # [Task 5.3/5.4] Hướng dẫn triển khai Production & Rollback
├── tests/                                      # Kiểm thử tích hợp & End-to-End (Playwright)
├── .github/
│   ├── workflows/                              # GitHub Actions Pipelines (ci.yml, cd.yml)
│   └── pull_request_template.md                # Mẫu checklist bắt buộc khi mở Pull Request
├── docker-compose.yml                          # Khởi chạy môi trường Database / Services tại Local
├── .env.example                                # Mẫu biến môi trường cho PostgreSQL, NestJS API và Next.js Web
├── .gitignore                                  # Loại trừ node_modules, .env, build artifacts
└── README.md                                   # Tài liệu hướng dẫn tổng thể dự án
```

---

## 🚀 3. Hướng Dẫn Cài Đặt & Chạy Hệ Thống Tại Local

### 3.1. Yêu cầu môi trường (Prerequisites)
- **Node.js:** `>= 20.x` và **npm:** `>= 10.x`
- **Docker Desktop** (hoặc Docker Engine + Docker Compose) để chạy PostgreSQL 16.

### 3.2. Các bước thiết lập nhanh (Step-by-Step)

**Bước 1: Clone repository và cài đặt gói phụ thuộc (Dependencies)**
```bash
git clone https://github.com/buihoangviet2982006-dotcom/Brew-lite-assignment2.git
cd Brew-lite-assignment2
npm install
```

**Bước 2: Thiết lập biến môi trường (`.env`)**
Sao chép tệp `.env.example` thành `.env` tại thư mục gốc (và trong `apps/api/.env` nếu chạy Prisma CLI độc lập):
```bash
cp .env.example .env
cp .env.example apps/api/.env
```

> Nội dung mặc định trong [`.env.example`](./.env.example):
> - `DATABASE_URL="postgresql://brewlite:brewlite_secret@localhost:5432/brewlite2_db?schema=public"`
> - `PORT=4000` (NestJS API)
> - `NEXT_PUBLIC_API_URL=http://localhost:4000` (Next.js Web)

**Bước 3: Khởi động cơ sở dữ liệu PostgreSQL bằng Docker Compose**
```bash
docker-compose up -d
```

**Bước 4: Khởi tạo Prisma Client, chạy Migration và nạp dữ liệu mẫu (Seed)**
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

**Bước 5: Khởi chạy đồng thời Backend API và Frontend Web**
```bash
npm run dev
```
- **Frontend Next.js (Mobile-First Menu):** Truy cập `http://localhost:3000` (hoặc `http://localhost:3000/menu`)
- **Backend NestJS API:** Hoạt động tại `http://localhost:4000`
  - Danh sách sản phẩm: `GET http://localhost:4000/products`
  - Chi tiết sản phẩm: `GET http://localhost:4000/products/:id`

---

## 🧪 4. Kiểm Thử, Lint & Build (Quality Gate)

Dự án tích hợp các lệnh kiểm tra chất lượng thống nhất từ thư mục gốc của Monorepo:

| Mục đích | Câu lệnh thực thi | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Chạy toàn bộ Unit & Component Tests** | `npm run test` | Chạy đồng thời Jest trên `@brewlite/api` (15 test cases) và Vitest trên `@brewlite/web` (6 test cases). |
| **Kiểm tra quy chuẩn mã nguồn (Lint)** | `npm run lint` | Chạy ESLint trên cả hai workspace `apps/api` và `apps/web`. |
| **Build kiểm tra Production** | `npm run build` | Biên dịch mã nguồn TypeScript của NestJS (`dist/`) và Next.js (`/.next`). |
| **Chạy End-to-End Tests** | `npm run test:e2e` | Thực thi kịch bản kiểm thử tự động trình duyệt bằng Playwright (`tests/`). |

---

## 🌿 5. Chiến Lược Branch, Pull Request, Quy Ước Commit & Definition of Done (Task 4.1)

> 📄 Xem tài liệu quy định chi tiết tại: **[`docs/development-workflow.md`](./docs/development-workflow.md)**

### 5.1. Chiến lược Branch (Simplified Gitflow)
- **`main`**: Nhánh Production ổn định, chỉ nhận merge từ `develop` qua Pull Request khi kết thúc Sprint/Release.
- **`develop`**: Nhánh tích hợp trung tâm của nhóm trong suốt Sprint 1 và Sprint 2.
- **Nhánh công việc (tách từ `develop`)**:
  - `docs/<task-name>`: Xây dựng/cập nhật tài liệu yêu cầu, sơ đồ UML, kiến trúc (VD: `docs/task-1-requirements`, `docs/task-2-uml-diagrams`, `docs/task-3-architecture`).
  - `feat/<task-id>-<short-desc>`: Phát triển tính năng mới (VD: `feat/task4.3-api-products`, `feat/task4.3-menu-ui`).
  - `fix/<scope>-<short-desc>`: Sửa lỗi giao diện hoặc logic nghiệp vụ.
  - `test/<task-id>-<short-desc>`: Viết bổ sung Unit, Integration, E2E test.
  - `ci/<short-desc>`: Cấu hình GitHub Actions CI/CD (VD: `ci/setup-github-actions`).

### 5.2. Quy trình Pull Request & CI Quality Gate
1. Mọi thay đổi mã nguồn (`apps/*`) hoặc tài liệu (`docs/*`) **bắt buộc phải tạo Pull Request** vào nhánh `develop` (tuân thủ mẫu [`.github/pull_request_template.md`](./.github/pull_request_template.md)) và ghi rõ lý do thay đổi (Task 4.2).
2. Khi mở PR, pipeline Continuous Integration (`.github/workflows/ci.yml`) tự động thực thi:
   $$\text{Install} \longrightarrow \text{Lint} \longrightarrow \text{Unit Test} \longrightarrow \text{Build}$$
3. **Quy tắc chặn Merge:** Pull Request **không được phép merge** nếu `Lint`, `Unit Test` hoặc `Build` thất bại, hoặc chưa có ít nhất 01 thành viên review và `Approve`.

### 5.3. Quy ước Commit (Conventional Commits)
Cấu trúc thống nhất:
```text
<type>(<scope>): <mô tả ngắn gọn thay đổi>
```
- **`<type>`**: `feat` (tính năng mới), `fix` (sửa lỗi), `docs` (tài liệu/sơ đồ), `test` (kiểm thử), `ci` (pipeline/docker), `refactor` (tái cấu trúc), `chore` (cấu hình).
- **Ví dụ thực tế trong dự án:**
  - `feat(api): setup PostgreSQL, Prisma Product/Ingredient models, and seed script`
  - `feat(api): implement GET /products/:id endpoint (Task 4.3)`
  - `feat(menu): integrate MenuSkeleton, EmptySate and ErrorAlert into menu page`
  - `test(task-4.3): add unit, integration, and component tests for MVP sprint 1`
  - `docs(arch): gộp kiến trúc frontend-backend vào overview và chuẩn hóa ADR 001-004`

### 5.4. Định nghĩa Hoàn thành – Definition of Done (DoD)
Một User Story / Task chỉ được chuyển sang trạng thái **`Done`** trên Issue Board khi đạt đủ các tiêu chí:
1. **Nghiệp vụ & Thiết kế:** Đáp ứng 100% Tiêu chí chấp nhận (Acceptance Criteria) của mã yêu cầu `FR-xx` / `NFR-xx` trong SRS; không mâu thuẫn với Use-case, Activity/Sequence/Class Diagram và Prisma Schema.
2. **Chất lượng Frontend & Backend:**
   - Giao diện Mobile-First hiển thị đầy đủ 4 trạng thái: `loading` (`MenuSkeleton`), `empty` (`EmptyState`), `error` (`ErrorAlert`) và `success`.
   - API có kiểm tra dữ liệu đầu vào (`ValidationPipe`), xử lý ngoại lệ chuẩn hóa và không lộ bất kỳ thông tin nhạy cảm (`secret`) nào trong repository hay CI log.
3. **Kiểm thử & CI Gate:** Có đầy đủ Unit/Integration/Component Test, vượt qua `npm run lint`, `npm run test` (100% PASS) và `npm run build` tự động trên CI Pipeline.
4. **Truy vết & Tài liệu:** Đã cập nhật ánh xạ hai chiều vào [`docs/traceability-matrix.md`](./docs/traceability-matrix.md) và mọi thay đổi tài liệu đều được review qua Pull Request.

---

## 📋 6. Product Backlog & Issue Board (Sprint 1 & Sprint 2)

> 📊 Xem bảng Issue Board (Kanban) và chi tiết từng User Story tại: **[`docs/product-backlog.md`](./docs/product-backlog.md)**

| Giai đoạn | Sprint Goal | Phạm vi Hạng mục chính | Tổng Story Points |
| :--- | :--- | :--- | :---: |
| **Sprint 1**<br>*(Task 1 – Task 4)* | Tạo nền tảng kỹ thuật Monorepo, tài liệu có kiểm soát phiên bản, CI cơ bản và MVP đầu tiên chạy được cho luồng xem menu. | • **Task 1:** Bối cảnh, Stakeholder, SRS (`FR-01`..`FR-10`, `NFR-01`..`NFR-03`), Đặc tả Use-case Checkout (`#S1-01`..`#S1-03`).<br>• **Task 2:** Activity, Sequence & Domain Class Diagrams (`#S1-04`, `#S1-05`).<br>• **Task 3:** Kiến trúc C4/Layered, ADR `001`–`004` & Deployment Diagram (`#S1-06`, `#S1-07`).<br>• **Task 4:** Thiết lập Repo, Quản lý tài liệu, MVP Menu (`GET /products`, `GET /products/:id`, UI Menu Mobile-First, Seed DB, 21 Unit/Component Tests) & CI Pipeline (`#S1-08`..`#S1-12`). | **36 pts** |
| **Sprint 2**<br>*(Task 5 & Truy vết)* | Hoàn thành luồng End-to-End, kiểm thử tích hợp/E2E, tự động hóa CD và triển khai phiên bản Production truy cập qua HTTPS. | • **Task 5.1:** Chi tiết món (Size/Topping), Giỏ hàng Zustand, Đăng ký/Đăng nhập JWT, Đặt đơn + Transaction trừ kho, Thanh toán Ví/Thẻ/VietQR có `Idempotency-Key`, Lịch sử & Trạng thái đơn, Khuyến mãi & Tích điểm (`#S2-01`..`#S2-07`).<br>• **Task 5.2:** Unit/Integration/E2E Tests (Playwright), `docker-compose.yml` full-stack & `GET /health` (`#S2-08`, `#S2-09`).<br>• **Task 5.3 & 5.4:** CD Pipeline (Docker Image, Registry, Deploy Production, Safe Migration, Smoke Test, Rollback) & Bàn giao (`#S2-10`, `#S2-11`). | **53 pts** |

---

## 📑 7. Danh Mục Tài Liệu & Truy Vết Nhanh (Documentation Index)

- **Task 1 – Khai thác và đặc tả yêu cầu:**
  - [Task 1.1 – Bối cảnh, Stakeholder và Phạm vi](./docs/requirements/context-and-scope.md)
  - [Task 1.2 – Tài liệu SRS rút gọn (FR & NFR)](./docs/requirements/srs.md) | [Sơ đồ Use-case tổng quát](./docs/diagrams/usecase-general.svg)
  - [Task 1.3 – Đặc tả Use-case trọng tâm: Đặt và thanh toán đơn hàng](./docs/requirements/use-case-checkout.md) | [Sơ đồ Use-case Checkout](./docs/diagrams/usecase-checkout.svg)
- **Task 2 – Mô hình hóa hệ thống (UML Diagrams):**
  - [Task 2.1 – Activity Diagram (Luồng End-to-End)](./docs/diagrams/activity-checkout.svg) ([Mã nguồn `.puml`](./docs/diagrams/activity-checkout.puml))
  - [Task 2.2 – Sequence Diagram (Đặt & Thanh toán đơn hàng)](./docs/diagrams/sequence-checkout.svg) ([Mã nguồn `.puml`](./docs/diagrams/sequence-checkout.puml))
  - [Task 2.3 – Domain Class Diagram](./docs/diagrams/class-diagram.svg) ([Mã nguồn `.puml`](./docs/diagrams/class-diagram.puml))
- **Task 3 – Thiết kế kiến trúc:**
  - [Task 3.1 – Tổng quan Kiến trúc hệ thống (C4 & Layered Architecture)](./docs/architecture/overview.md)
  - Danh mục Quyết định Kiến trúc (ADRs): [ADR-001 (Monorepo)](./docs/architecture/adr/001-monorepo.md) · [ADR-002 (Modular Monolith NestJS)](./docs/architecture/adr/002-modular-monolith-nestjs.md) · [ADR-003 (PostgreSQL & Migration)](./docs/architecture/adr/003-postgresql-and-migration.md) · [ADR-004 (Payment & Idempotency)](./docs/architecture/adr/004-mock-payment.md)
  - [Task 3.2 – UML Deployment Diagram](./docs/diagrams/Deployment.svg) ([Mã nguồn `.puml`](./docs/diagrams/deployment.puml))
- **Task 4 – Thiết lập Repository, Quy trình, Backlog & CI:**
  - [Task 4.1 – Quy trình Branch, Pull Request, Commit & Definition of Done](./docs/development-workflow.md)
  - [Task 4.1 – Product Backlog & Issue Board (Sprint 1 & Sprint 2)](./docs/product-backlog.md)
  - [Task 4.4 – Minh chứng triển khai Continuous Integration (CI)](./docs/ci-evidence.md)
  - [Task 8.1 – Ma trận truy vết yêu cầu (Traceability Matrix)](./docs/traceability-matrix.md)
