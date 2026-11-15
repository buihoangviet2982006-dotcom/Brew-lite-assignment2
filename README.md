# ☕ BrewLite — Cashless Coffee Ordering Application (Assignment 2)

> **BÀI TẬP LỚN MÔN CÔNG NGHỆ PHẦN MỀM — VER 1.0**  
> **Khoa Công nghệ Thông tin — Trường Đại học Sài Gòn**  
> **Học kỳ:** I – Năm học 2026–2027

[![Scrum](https://img.shields.io/badge/Process-Agile%20Scrum-blue.svg)](docs/product-backlog.md)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20PWA-black.svg)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-NestJS%2010-red.svg)](https://nestjs.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20%2B%20Prisma-blue.svg)](https://www.prisma.io/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions%20%2B%20Docker-2496ED.svg)](.github/workflows/ci.yml)

---

## 📖 1. Giới Thiệu Dự Án, Thông Tin Nhóm & Các Bên Liên Quan

### 1.1. Tầm nhìn sản phẩm (Product Vision)

> *“BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm theo hướng Mobile-First / Progressive Web App (PWA), giảm thời gian xếp hàng giờ cao điểm và đảm bảo nhận đơn chính xác tại quầy.”*

Dự án **BrewLite (Assignment 2)** được phát triển theo mô hình **NPM Workspaces Monorepo**, áp dụng quy trình **Agile Scrum** từ khâu phân tích yêu cầu (SRS), mô hình hóa UML, thiết kế kiến trúc C4/ADR, hiện thực tính năng End-to-End, kiểm thử tự động đến đóng gói container và triển khai CI/CD.

**Luồng nghiệp vụ End-to-End cốt lõi:**

$$\text{Xem menu} \longrightarrow \text{Chọn tùy chọn (Size, Topping)} \longrightarrow \text{Giỏ hàng} \longrightarrow \text{Đăng nhập JWT} \longrightarrow \text{Đặt đơn} \longrightarrow \text{Thanh toán (VietQR / Ví / Thẻ)} \longrightarrow \text{Theo dõi đơn}$$

### 1.2. Thông tin nhóm thực hiện

| STT | Họ và tên | MSSV | Vai trò Scrum |
| :---: | :--- | :--- | :--- |
| 1 | _Bùi Hoàng Việt_ | _3124410403_ | Product Owner |
| 2 | _Đinh Đào Thái Sơn_ | _3123410306_ | Scrum Master |
| 3 | _Nguyễn Quang Đạt_ | _3122410071_ | Development Team |
| 4 | _Hoàng Gia Bảo_ | _3124410013_ | Development Team |
| 5 | _Trần Minh Trí_ | _3124410372_ | Development Team |
| 6 | _Cao Thanh Duy_ | _3123410054_ | Development Team |

- **Giảng viên hướng dẫn:** _Từ Lãng Phiêu_
- **Repository:** [_Brew-lite-assignment2_](https://github.com/buihoangviet2982006-dotcom/Brew-lite-assignment2)

### 1.3. Các bên liên quan (Stakeholders)

* **Khách hàng (Customer):** Xem thực đơn, tùy chọn Size (`S`/`M`/`L`) và Topping, quản lý giỏ hàng, đăng ký/đăng nhập JWT, thanh toán không tiền mặt (Ví/Thẻ/VietQR) và theo dõi lịch sử/trạng thái đơn hàng.
* **Quản lý cửa hàng / Product Owner (PO):** Định hướng yêu cầu, quản lý tồn kho nguyên liệu, khuyến mãi, ưu tiên Product Backlog và nghiệm thu Increment sau mỗi Sprint.
* **Nhóm phát triển (Development Team):** Thiết kế kiến trúc, lập trình Frontend/Backend, viết Unit/Integration/Component/E2E test và vận hành pipeline CI/CD, Docker.
* **Nhân viên quầy / Barista:** Tiếp nhận đơn hàng hợp lệ sau khi thanh toán thành công và cập nhật tiến độ pha chế (`PAID` → `PREPARING` → `COMPLETED`).
* **Giảng viên nghiệm thu:** Đánh giá quy trình Agile Scrum, truy vết thiết kế–mã nguồn–kiểm thử, chất lượng kỹ thuật và sản phẩm bàn giao Production.
* **Cổng thanh toán (SePay Sandbox & VietQR / Mock Payment):** Sinh mã QR chuyển khoản động chuẩn VietQR, mô phỏng thanh toán Ví/Thẻ và gửi Webhook xác nhận giao dịch có kiểm soát `Idempotency-Key`.

---

## 🏗️ 2. Kiến Trúc & Công Nghệ (Architecture & Tech Stack)

```text
[ Frontend: Next.js 14 (Mobile-First / PWA) + Tailwind CSS + Zustand ]
                                 │  ▲
                       REST/JSON │  │  JWT Bearer + Idempotency-Key
                                 ▼  │
[ Backend: NestJS 10 (Modular Monolith) + REST API ] ───► [ SePay Sandbox & VietQR Gateway ]
                                 │
                      Prisma ORM │  ACID Transaction & Optimistic Locking
                                 ▼
                  [ Database: PostgreSQL 16 ]
```

### 2.1. Bảng công nghệ theo từng tầng

| Tầng hệ thống | Công nghệ & Thư viện chính | Ghi chú & Vai trò trong dự án |
| :--- | :--- | :--- |
| **Frontend (`apps/web`)** | **Next.js 14** (App Router), React 18, TypeScript, Tailwind CSS, Zustand, `@tanstack/react-query`, `@ducanh2912/next-pwa` | Giao diện Mobile-First / PWA, xử lý 4 trạng thái chuẩn (`loading`, `empty`, `error`, `success`), tính giá Size/Topping động, quản lý giỏ hàng & phiên đăng nhập JWT. |
| **Backend (`apps/api`)** | **NestJS 10**, TypeScript, Prisma ORM, Passport-JWT, `bcrypt`, `class-validator`, `@nestjs/terminus` | Kiến trúc Modular Monolith, xác thực JWT, kiểm soát trừ tồn kho bằng `Prisma.$transaction` + Optimistic Locking (`version`), chuẩn hóa validation đầu vào. |
| **Cơ sở dữ liệu** | **PostgreSQL 16** (Docker Container), Prisma Client & Schema/Migration | Quản lý 10 bảng quan hệ (`users`, `products`, `toppings`, `promotions`, `orders`, `order_items`, `payments`, `loyalty_transactions`, `ingredients`, `recipe_items`). |
| **Thanh toán** | **VietQR** + **SePay Sandbox API v2** + Chế độ mô phỏng xác định | Sinh mã VietQR động, đối soát Polling (`/v2/transactions`) & Webhook (`SepayWebhookGuard`), chống trùng lặp 2 chiều qua `Idempotency-Key`. |
| **Kiểm thử & DevOps** | **Jest** & **Supertest**, **Vitest** & **React Testing Library**, **Playwright**, **Docker**, **GitHub Actions** | Tự động hóa Quality Gate (`Lint → Test → Build`), đóng gói container Docker Image, đẩy lên GHCR/Docker Hub và kích hoạt deploy. |

### 2.2. Máy Trạng Thái Đơn Hàng (Order State Machine)

Theo đặc tả `FR-08` và `schema.prisma`, vòng đời đơn hàng tuân thủ các trạng thái chuyển đổi nghiêm ngặt sau:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Khách tạo giỏ hàng & đặt đơn (POST /orders)
    PENDING --> PAID: Thanh toán thành công (POST /payments hoặc SePay Webhook)
    PENDING --> PAYMENT_FAILED: Thanh toán lỗi / Quá hạn (hoàn trả tồn kho & voucher)
    PENDING --> CANCELLED: Khách hủy đơn trước thanh toán
    PAYMENT_FAILED --> PAID: Thanh toán lại thành công
    PAYMENT_FAILED --> CANCELLED: Hủy đơn sau khi lỗi thanh toán
    PAID --> PREPARING: Barista tiếp nhận pha chế (PATCH /orders/:id/status)
    PREPARING --> COMPLETED: Pha chế xong & bàn giao tại quầy (cộng Loyalty)
    COMPLETED --> [*]
    CANCELLED --> [*]
```

---

## 📁 3. Cấu Trúc Kho Mã Nguồn (Monorepo Structure)

Dự án được tổ chức theo mô hình **NPM Workspaces Monorepo**:

```text
Brew-lite-assignment2/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                              # Pipeline CI: Install -> db:generate -> Lint -> Test -> Build
│   │   ├── cd.yml                              # Pipeline CD: Quality Gate -> Docker Image -> GHCR -> Migration -> Deploy -> Smoke Test -> Rollback
│   │   └── cd-rollback-guard.yml               # Workflow Fail-Fast Gate & Kiểm thử Rollback tự động
│   └── pull_request_template.md                # Mẫu checklist bắt buộc khi mở Pull Request
├── apps/
│   ├── api/                                    # NestJS 10 Modular Monolith Backend (Port 4000)
│   │   ├── prisma/
│   │   │   ├── migrations/                     # SQL Migrations (20261114163354_init_brewlite_schema)
│   │   │   ├── schema.prisma                   # Schema PostgreSQL (10 models + 5 enums)
│   │   │   └── seed.ts                         # Script nạp dữ liệu mẫu (15 sản phẩm, 12 nguyên liệu, 6 toppings, 4 voucher)
│   │   ├── src/
│   │   │   ├── common/guards/                  # JwtAuthGuard dùng chung
│   │   │   ├── modules/
│   │   │   │   ├── auth/                       # Module xác thực JWT, bcrypt (/auth/register, /auth/login, /auth/me)
│   │   │   │   ├── products/                   # Module sản phẩm, topping & tồn kho công thức
│   │   │   │   ├── orders/                     # Module đặt đơn, Prisma Transaction, Optimistic Locking & State Machine
│   │   │   │   ├── payments/                   # Module thanh toán VietQR, SePay Sandbox, Polling & Webhook Guard
│   │   │   │   ├── promotions/                 # Khung module khuyến mãi
│   │   │   │   └── health/                     # Khung module kiểm tra sức khỏe dịch vụ
│   │   │   ├── prisma/                         # PrismaModule & PrismaService
│   │   │   ├── core-e2e-flow.integration.spec.ts # Integration test xuyên suốt 6 bước nghiệp vụ cốt lõi
│   │   │   ├── app.module.ts                   # Root Module (ConfigModule, Prisma, Auth, Products, Orders, Payments)
│   │   │   └── main.ts                         # Entrypoint NestJS (CORS, ValidationPipe, ShutdownHooks)
│   │   ├── test/jest-e2e.json                  # Cấu hình chạy test:e2e cho luồng Core E2E Backend
│   │   ├── .env.example                        # Biến môi trường mẫu cho Backend
│   │   ├── Dockerfile                          # Dockerfile đóng gói Backend NestJS
│   │   └── package.json
│   └── web/                                    # Next.js 14 Mobile-First / PWA Frontend (Port 3000)
│       ├── public/
│       │   └── manifest.json                   # Cấu hình Web App Manifest cho PWA
│       ├── src/
│       │   ├── app/                            # Next.js App Router (/menu, /menu/[id], /cart, /checkout, /orders, /orders/[id], /login, /register)
│       │   ├── components/                     # UI Components (MenuSkeleton, EmptySate, ErrorAlert, ProductCard, VietQrPaymentModal) & *.spec.tsx
│       │   ├── lib/                            # API Clients (auth-api.ts, product-api.ts, order-api.ts, payment-api.ts)
│       │   ├── store/                          # Zustand State Management (auth.store.ts, cart.store.ts)
│       │   ├── types/                          # TypeScript interfaces (auth.ts, product.ts, order.ts, payment.ts)
│       │   └── utils/                          # Tiện ích tính giá Size/Topping (product-options.ts)
│       ├── .env.example                        # Biến môi trường mẫu cho Frontend
│       ├── Dockerfile                          # Dockerfile đóng gói Frontend Next.js
│       ├── next.config.mjs                     # Cấu hình Next.js & PWA
│       ├── vitest.config.ts                    # Cấu hình Vitest + jsdom
│       └── package.json
├── docs/                                       # Tài liệu phân tích, thiết kế, quy trình, bảo mật & vận hành
│   ├── requirements/                           # [Task 1] Bối cảnh, Stakeholder, SRS & Đặc tả Use-case Checkout
│   ├── diagrams/                               # [Task 2 & 3] Mã nguồn PlantUML (.puml) và ảnh kết xuất (.svg)
│   ├── architecture/                           # [Task 3] Tài liệu kiến trúc C4/Layered (overview.md) & ADRs (001–004)
│   ├── development-workflow.md                 # [Task 4.1] Chiến lược Branch, PR, Quy ước Commit & Definition of Done
│   ├── product-backlog.md                      # [Task 4.1] Product Backlog & Issue Board cho Sprint 1 và Sprint 2
│   ├── ci-evidence.md                          # [Task 4.4] Minh chứng triển khai Continuous Integration (CI)
│   ├── traceability-matrix.md                  # [Task 8.1] Ma trận truy vết Yêu cầu ↔ Thiết kế ↔ Code ↔ Test
│   ├── security-audit.md                       # [Task 5.4] Báo cáo rà soát bảo mật Repository & CI/CD Logs
│   ├── sprint-review-retrospective.md          # [Task 5.4] Báo cáo Sprint Review & Sprint Retrospective
│   ├── deployment/rollback-strategy.md         # [Task 5.3] Chiến lược Fail-Fast Gate & Rollback tự động
│   └── deployment.md                           # [Task 5.3/5.4] Hướng dẫn triển khai Render, Vercel & Migration
├── scripts/
│   └── rollback-deploy.sh                      # Script tự động kích hoạt Rollback & ghi biên bản kiểm toán
├── tests/                                      # Kiểm thử End-to-End (Playwright)
│   ├── e2e/
│   │   └── order-checkout.spec.ts              # Kịch bản E2E toàn trình (Menu -> Xác nhận đơn PAID)
│   └── playwright.config.ts
├── CHANGELOG.md                                # Nhật ký thay đổi & Release Notes v1.0.0 (Task 5.4)
├── .env.example                                # Biến môi trường mẫu chung toàn Monorepo
├── .gitignore
├── docker-compose.yml                          # Khởi chạy đồng bộ PostgreSQL 16 + NestJS API + Next.js Web ở Local
├── package.json                                # NPM Workspaces & Scripts điều phối toàn Monorepo
└── README.md                                   # Tài liệu hướng dẫn chính
```

---

## ⚡ 4. Hướng Dẫn Cài Đặt & Chạy Tại Local (Local Development)

### 4.1. Yêu cầu hệ thống (Prerequisites)

- **Node.js:** `>= 20.x` (khuyến nghị Node.js 20 LTS, đồng bộ với CI và Dockerfile)
- **npm:** `>= 10.x`
- **Docker & Docker Compose:** Docker Desktop hoặc Docker Engine + Docker Compose v2

### 4.2. Cách 1: Chạy Local Development với NPM Workspaces + Docker PostgreSQL (Khuyên dùng)

**Bước 1: Clone repository và cài đặt toàn bộ dependencies cho Monorepo**

```bash
git clone https://github.com/buihoangviet2982006-dotcom/Brew-lite-assignment2.git
cd Brew-lite-assignment2
npm install
```

**Bước 2: Thiết lập tệp biến môi trường (`.env`)**

Sao chép các tệp mẫu cấu hình cho thư mục gốc, Backend API và Frontend Web:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

> **Lưu ý trên Windows (PowerShell):** Bạn có thể dùng `Copy-Item .env.example .env`, `Copy-Item apps/api/.env.example apps/api/.env`, `Copy-Item apps/web/.env.example apps/web/.env.local`.

**Bước 3: Khởi chạy hệ thống bằng Docker Compose (PostgreSQL + API + Web)**

```bash
# Chạy toàn bộ 3 dịch vụ (postgres, api, web) ở local:
docker compose up -d --build

# Hoặc chỉ chạy PostgreSQL nếu muốn dev trực tiếp bằng npm run dev:
docker compose up -d postgres
```

Khi chạy `docker compose up -d --build`, container `brewlite2_postgres` mở cổng `5432`, `brewlite2_api` tự động chạy `prisma migrate deploy` và mở cổng `4000` (kèm healthcheck `/health`), và `brewlite2_web` mở cổng `3000`.

**Bước 4: Khởi tạo Prisma Client, đồng bộ Schema và nạp dữ liệu mẫu (Seed Data)**

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

> Nếu cần tạo lại DB sạch từ đầu ở local, có thể dùng `npm run db:reset` hoặc `npm run db:setup`.

Sau khi chạy `npm run db:seed`, script [`apps/api/prisma/seed.ts`](./apps/api/prisma/seed.ts) tự động làm sạch và khởi tạo dữ liệu mẫu cho cả **10 bảng**, gồm:

| Nhóm dữ liệu | Chi tiết được khởi tạo sẵn |
| :--- | :--- |
| **Tài khoản kiểm thử** *(Mật khẩu chung: `Password123!`)* | • **Quản lý:** `manager@brewlite.vn` (100 điểm)<br>• **Barista:** `barista@brewlite.vn` (50 điểm)<br>• **Khách hàng 1:** `customer@brewlite.vn` (158 điểm, 2 đơn mẫu)<br>• **Khách hàng 2:** `customer2@brewlite.vn` (0 điểm, 1 đơn `PENDING`) |
| **Kho nguyên liệu (12 món)** | Cà phê hạt Robusta (`15,000g`), Arabica (`12,000g`), Sữa tươi (`30,000ml`), Sữa đặc (`18,000ml`), Matcha Uji (`4,000g`), Nước đường (`15,000ml`), Trà Oolong (`6,000g`), Trà đen Assam (`6,000g`), Sốt Chocolate Bỉ (`5,000ml`), Đào miếng (`5,000g`), Khoai môn (`4,000g`), và Mứt Yuzu (`0ml` — demo hết hàng) |
| **Thực đơn & Công thức (15 món)** | 14 món sẵn sàng bán (*Espresso Intenso, Cà phê sữa đá BrewLite, Cà phê đen đá Sài Gòn, Bạc xỉu kem sữa đá, Americano Đá Lạnh, Caffe Latte, Cappuccino Classic, Caramel Macchiato, Mocha Chocolate Bỉ, Kyoto Matcha Latte, Trà sữa Oolong nướng, Hồng trà sữa Assam, Trà sữa Khoai Môn Taro, Trà đào cam sả*) và 1 món tạm hết hàng (*Cold Brew Yuzu*) |
| **Toppings (6 loại)** | Trân châu đường đen dẻo (10.000đ), Kem Cheese Macchiato (12.000đ), Thạch nha đam (10.000đ), Sốt Caramel thủ công (8.000đ), Pudding trứng mềm mịn (10.000đ), Thạch cà phê Espresso (9.000đ) |
| **Mã khuyến mãi (4 mã)** | `WELCOME10` (-10.000đ, tối thiểu 40.000đ), `BREWLITE20` (-20.000đ, tối thiểu 80.000đ), `FREESHIP` (-15.000đ, tối thiểu 50.000đ), `BREW50` (-25.000đ, tối thiểu 120.000đ) |
| **Đơn hàng mẫu (3 đơn)** | 1 đơn `COMPLETED` (có Payment `WALLET` + `LoyaltyTransaction`), 1 đơn `PREPARING` (có Payment `CARD`), 1 đơn `PENDING` |

**Bước 5: Khởi chạy đồng thời Backend API và Frontend Web**

```bash
npm run dev
```

Hoặc chạy riêng từng dịch vụ ở 2 cửa sổ terminal độc lập:

```bash
# Terminal 1: Backend NestJS (watch mode)
npm run dev:api

# Terminal 2: Frontend Next.js
npm run dev:web
```

**Địa chỉ truy cập & Endpoint kiểm tra nhanh tại Local:**
* **Frontend Web (Next.js App Router):** [http://localhost:3000](http://localhost:3000) (Thực đơn: `/menu`, Chi tiết món: `/menu/[id]`, Giỏ hàng: `/cart`, Đăng nhập/Đăng ký: `/login` & `/register`, Thanh toán: `/checkout`, Đơn hàng: `/orders` & `/orders/[id]`)
* **Backend API Base URL:** [http://localhost:4000](http://localhost:4000)
* **Các API Endpoints chính:**
  * Xác thực JWT: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
  * Thực đơn & Topping: `GET /products`, `GET /products/toppings`, `GET /products/:id`
  * Đơn hàng (JWT Guard): `POST /orders`, `GET /orders`, `GET /orders/me`, `GET /orders/:id`, `PATCH /orders/:id/status`
  * Thanh toán & VietQR/SePay: `POST /payments` (Header `Idempotency-Key`), `GET /payments/order/:orderId/status`, `POST /payments/sepay-webhook`, `POST /payments/sepay-webhook/simulate`, `GET /payments/sepay-sandbox/bank-accounts`

---

### 4.3. Cách 2: Chạy bằng Docker Container độc lập (PostgreSQL + Backend + Frontend)

Khi triển khai chạy container hóa bằng `Dockerfile` (tích hợp từ cấu hình đóng gói Docker Task 5.3):

```bash
# 1. Khởi chạy PostgreSQL container (nếu chưa chạy docker compose up -d)
docker compose up -d

# 2. Build image cho Backend API & Frontend Web từ thư mục gốc Monorepo
docker build -f apps/api/Dockerfile -t brewlite-api:local .
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 \
  --build-arg NEXT_PUBLIC_APP_NAME=BrewLite \
  -t brewlite-web:local .

# 3. Chạy container Backend API
docker run -d \
  --name brewlite-api \
  -p 4000:4000 \
  --env-file apps/api/.env \
  -e DATABASE_URL="postgresql://brewlite:brewlite_secret@host.docker.internal:5432/brewlite2_db?schema=public" \
  brewlite-api:local

# 4. Nạp dữ liệu mẫu vào DB (chạy 1 lần)
docker exec brewlite-api npm run prisma:seed --workspace=@brewlite/api

# 5. Chạy container Frontend Web
docker run -d \
  --name brewlite-web \
  -p 3000:3000 \
  brewlite-web:local
```

---

### 4.4. Bảng Biến Môi Trường Chính (`.env`)

| Biến môi trường | Nơi dùng | Giá trị mặc định (`.env.example`) | Mô tả |
| :--- | :--- | :--- | :--- |
| `POSTGRES_USER` | `docker-compose.yml` | `brewlite` | Tên người dùng PostgreSQL local |
| `POSTGRES_PASSWORD` | `docker-compose.yml` | `brewlite_secret` | Mật khẩu PostgreSQL local |
| `POSTGRES_DB` | `docker-compose.yml` | `brewlite2_db` | Tên database khởi tạo |
| `POSTGRES_PORT` | `docker-compose.yml` | `5432` | Cổng map ra máy host |
| `DATABASE_URL` | `apps/api` | `postgresql://brewlite:brewlite_secret@localhost:5432/brewlite2_db?schema=public` | Chuỗi kết nối Prisma tới PostgreSQL |
| `DIRECT_URL` | `apps/api` | `postgresql://brewlite:brewlite_secret@localhost:5432/brewlite2_db?schema=public` | Chuỗi kết nối trực tiếp cho `prisma migrate` |
| `PORT` | `apps/api` | `4000` | Cổng lắng nghe của NestJS server |
| `NODE_ENV` | `apps/api` | `development` | Môi trường chạy (`development` / `production`) |
| `JWT_SECRET` | `apps/api` | `your-super-secret-jwt-key-change-in-production` | Khóa bí mật ký/xác thực JWT |
| `JWT_EXPIRES_IN` | `apps/api` | `7d` | Thời hạn hiệu lực của Access Token |
| `CORS_ORIGIN` | `apps/api` | `http://localhost:3000` | Origin được phép gọi API qua CORS |
| `SEPAY_API_BASE_URL` | `apps/api` | `https://userapi-sandbox.sepay.vn/v2` | Endpoint SePay Sandbox API v2 |
| `SEPAY_API_TOKEN` | `apps/api` | *(trống)* | API Token SePay dùng cho polling `/v2/transactions` |
| `SEPAY_WEBHOOK_SECRET` | `apps/api` | `sepay_sandbox_secret_2026` | Secret xác thực header `Authorization: Apikey` từ Webhook |
| `VIETQR_BANK_ID` | `apps/api` | `MB` | Mã ngân hàng thụ hưởng VietQR |
| `VIETQR_ACCOUNT_NO` | `apps/api` | `0123456789` | Số tài khoản nhận tiền |
| `VIETQR_ACCOUNT_NAME` | `apps/api` | `BREWLITE COFFEE` | Tên chủ tài khoản hiển thị trên QR |
| `VIETQR_TEMPLATE` | `apps/api` | `compact2` | Mẫu hiển thị ảnh QR từ `img.vietqr.io` |
| `NEXT_PUBLIC_API_URL` | `apps/web` | `http://localhost:4000` | URL Backend API phía trình duyệt/SSR gọi tới |
| `NEXT_PUBLIC_APP_NAME` | `apps/web` | `BrewLite` | Tên hiển thị ứng dụng |

---

## 🧪 5. Kiểm Thử, Lint & Build (Testing & Build Guide)

### 5.1. Tổng hợp câu lệnh Kiểm thử, Lint & Build (Quality Gate)

Mọi lệnh có thể chạy trực tiếp từ thư mục gốc Monorepo:

| Mục đích | Câu lệnh thực thi | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Chạy toàn bộ Unit / Integration / Component Tests** | `npm run test` | Chạy đồng thời **Jest** trên `@brewlite/api` và **Vitest** trên `@brewlite/web` (Mock DB/API độc lập, không yêu cầu DB sống). |
| **Kiểm tra quy chuẩn mã nguồn (Lint)** | `npm run lint` | Chạy ESLint trên cả `apps/api` và `apps/web`. |
| **Build kiểm tra Production** | `npm run build` | Biên dịch mã nguồn TypeScript của NestJS (`apps/api/dist`) và Next.js (`apps/web/.next`). |
| **Build riêng từng ứng dụng** | `npm run build:api`<br>`npm run build:web` | Biên dịch độc lập Backend API hoặc Frontend Web. |
| **Chạy E2E Flow API Integration** | `npm run test:e2e --workspace=@brewlite/api` | Chạy `apps/api/test/jest-e2e.json` kiểm thử xuyên suốt 6 bước nghiệp vụ trong `core-e2e-flow.integration.spec.ts`. |
| **Chạy Playwright E2E Tests** | `npm run test:e2e` | Thực thi kịch bản trình duyệt thật [`tests/e2e/order-checkout.spec.ts`](./tests/e2e/order-checkout.spec.ts) trên hệ thống đang chạy (cần chạy `npx playwright install chromium` lần đầu). |

**Lệnh chạy kiểm thử chuyên sâu trong từng workspace:**

```bash
# Kiểm thử Backend NestJS (Jest) kèm báo cáo độ phủ (coverage)
npm run test:cov --workspace=@brewlite/api

# Kiểm thử Frontend Next.js (Vitest watch mode)
npm run test:watch --workspace=@brewlite/web
```

### 5.2. Phạm vi Kiểm thử Tự động hiện có (16 Test Suites — 84 Test Cases)

| Workspace | Tệp kiểm thử | Số lượng & Phạm vi kiểm chứng chính |
| :--- | :--- | :--- |
| **`@brewlite/api`** *(Jest — 10 suites, 60 tests)* | • `products.controller.spec.ts`<br>• `products.service.spec.ts`<br>• `products.integration.spec.ts` | Kiểm thử `GET /products`, `GET /products/:id`, tính toán tồn kho tự động theo công thức nguyên liệu (`RecipeItem`), trả lỗi `404 NotFoundException`. |
| **`@brewlite/api`** | • `auth.controller.spec.ts`<br>• `auth.service.spec.ts`<br>• `auth.integration.spec.ts` | Kiểm thử `POST /auth/register` (`bcrypt` hash), `POST /auth/login` (cấp JWT hoặc ném `401`), bảo vệ route `GET /auth/me` bằng `JwtAuthGuard`. |
| **`@brewlite/api`** | • `orders.service.spec.ts` | Kiểm thử `POST /orders` tạo đơn `PENDING`, trừ tồn kho nguyên liệu trong `Prisma.$transaction` với **Optimistic Locking** (`version`), ném `409 Conflict` khi thiếu nguyên liệu hoặc xảy ra Race Condition (`count = 0`), ném `400` khi trùng topping, lấy danh sách & chi tiết đơn (`404`), và chuyển trạng thái State Machine. |
| **`@brewlite/api`** | • `payments.service.spec.ts`<br>• `payments.controller.spec.ts` | Kiểm thử sinh mã **VietQR** động cho `WALLET`/`CARD`, chống trùng lặp 2 chiều (`Idempotency-Key` phía Client & Webhook retry từ SePay), mô phỏng `SUCCESS`, đối soát Polling `/v2/transactions`, xử lý `MOCK_FAIL` (`400`) & tổng tiền đuôi `99` (`504 Gateway Timeout`) kèm hoàn trả tồn kho + voucher, bảo vệ Webhook bằng `SepayWebhookGuard` (`401`). |
| **`@brewlite/api`** | • `core-e2e-flow.integration.spec.ts` | Kiểm thử tích hợp End-to-End 6 bước trên Backend (Menu → Tùy chọn → Giỏ/Tính giá → Đăng ký/Đăng nhập JWT & Đặt đơn → Thanh toán Idempotency → Theo dõi trạng thái). |
| **`@brewlite/web`** *(Vitest + jsdom — 6 suites, 24 tests)* | • `Menu.spec.tsx` (7 tests)<br>• `ProductOptions.spec.tsx` (2 tests)<br>• `Cart.spec.tsx` (2 tests)<br>• `Auth.spec.tsx` (9 tests)<br>• `CheckoutPayment.spec.tsx` (3 tests)<br>• `CoreE2EFlow.spec.tsx` (1 test) | Kiểm thử màn hình `/menu` (Loading `MenuSkeleton`, Empty `EmptyState`, Error `ErrorAlert` + Retry, Success, Search & Category filter); chọn Size/Topping và chặn vượt quá 3 topping; Zustand Cart Store; Đăng nhập/Đăng ký `/login`, `/register` & lưu token; Checkout hiển thị Modal VietQR, giả lập Webhook chốt đơn `PAID` và giữ giỏ hàng khi `MOCK_FAIL`; luồng End-to-End 6 bước trên Next.js UI. |

> **Lưu ý trên Windows PowerShell:** Nếu PowerShell chặn thực thi file `npm.ps1` do Execution Policy, sử dụng `npm.cmd run test`, `npm.cmd run lint`, `npm.cmd run build`.

### 5.3. Hướng dẫn Build & Chạy Thử Bản Production tại Local

**Build toàn bộ Monorepo:**

```bash
# 1. Đảm bảo Prisma Client đã được sinh trước khi biên dịch Backend
npm run db:generate

# 2. Chạy Quality Gate đầy đủ trước khi đóng gói
npm run lint
npm run test
npm run build
```

**Chạy thử bản Production đã build tại máy Local:**

```bash
# Khởi chạy Backend NestJS từ bản build dist/
npm run start:prod --workspace=@brewlite/api

# Khởi chạy Frontend Next.js từ bản build .next/
npm run start --workspace=@brewlite/web
```

---

## 🚀 6. Hướng Dẫn Triển Khai (Deploy) & Quay Lui (Rollback)

> 📄 Tham khảo thêm sơ đồ kiến trúc triển khai tại **[`docs/diagrams/deployment.puml`](./docs/diagrams/deployment.puml)**, báo cáo bảo mật **[`docs/security-audit.md`](./docs/security-audit.md)** và hướng dẫn đóng gói Container Registry tại **[`docs/deployment.md`](./docs/deployment.md)**.

### 6.1. Pipeline CI/CD Tự Động trên GitHub Actions

```text
[Pull Request vào develop / main]
   └──► CI (.github/workflows/ci.yml):
        npm ci -> npm run db:generate -> npm run lint -> npm run test -> npm run build
        (Chặn Merge nếu bất kỳ bước nào thất bại)

[Push lên main hoặc Tag v*.*.*]
   └──► CD (.github/workflows/cd.yml — luồng Task 5.3):
        Quality Gate (Lint -> Test -> Build)
        -> Build & Push Docker Image (brewlite-api + brewlite-web gắn tag sha-<short> & SemVer lên GHCR)
        -> Safe Migration (prisma migrate deploy bằng RENDER_DATABASE_URL)
        -> Deploy Render API + Smoke Test (/health)
        -> Deploy Vercel Web + Smoke Test (/menu)
        -> Dừng pipeline & kích hoạt scripts/rollback-deploy.sh nếu có bước thất bại
```

### 6.2. Chiến lược Gắn Tag Docker Image & Container Registry

Mỗi lần build qua pipeline CD sẽ tạo 2 image (`apps/api/Dockerfile` và `apps/web/Dockerfile`) và gắn đa thẻ (multi-tagging) để đảm bảo truy vết và rollback an toàn:

| Loại Tag | Định dạng ví dụ | Khi nào được tạo | Mục đích |
| :--- | :--- | :--- | :--- |
| **Commit SHA (Short)** | `sha-6cf95e7` | Mọi lần push/build | Định danh bất biến theo từng commit; dùng để **Rollback tức thì** về đúng phiên bản ổn định trước đó. |
| **Branch Ref** | `main`, `develop` | Push lên nhánh tương ứng | Trỏ tới bản build mới nhất của nhánh. |
| **SemVer (Semantic)** | `v1.0.0`, `1.0.0`, `1.0` | Khi push Git tag `v*` | Đánh dấu phiên bản phát hành chính thức (Release). |
| **Latest** | `latest` | Chỉ khi push lên `main` | Phiên bản Production mặc định mới nhất. |

**Container Registry & Secrets cấu hình trên GitHub Repository:**

| Thành phần | Registry / Secret Name | Mô tả |
| :--- | :--- | :--- |
| **GHCR (Mặc định)** | `ghcr.io/<owner>/brewlite-api:<tag>`<br>`ghcr.io/<owner>/brewlite-web:<tag>` | Xác thực tự động bằng `${{ secrets.GITHUB_TOKEN }}` (`packages: write`). |
| **Render PostgreSQL** | `RENDER_DATABASE_URL` | External URL dùng riêng cho `prisma migrate deploy` trong CD pipeline. |
| **Render API Deploy Hook** | `RENDER_DEPLOY_HOOK` | Webhook kích hoạt deploy lại Backend API trên Render sau khi migration thành công. |
| **Vercel Web Deploy Hook** | `VERCEL_DEPLOY_HOOK` | Webhook kích hoạt deploy lại Frontend Web trên Vercel sau khi API `/health` pass. |
| **Rollback Webhook (Tùy chọn)** | `ROLLBACK_WEBHOOK_URL` | Webhook kích hoạt rollback tự động từ `scripts/rollback-deploy.sh` khi deploy/smoke test lỗi. |

### 6.3. Các Bước Triển Khai Production (Deployment)

#### Phương án A: Triển khai Tự động qua CI/CD Pipeline & Cloud PaaS (Render + Vercel + Neon/Render PostgreSQL)

1. **Chuẩn bị biến môi trường Production trên nền tảng Cloud:**
   - **Database (PostgreSQL 16):** Tạo DB trên Render PostgreSQL hoặc Neon, lấy cả `DATABASE_URL` (pooled/internal) và `DIRECT_URL` (direct connection phục vụ `prisma migrate deploy`).
   - **Backend Service (`apps/api` trên Render Docker):** Thiết lập `DATABASE_URL`, `DIRECT_URL`, `PORT=4000`, `NODE_ENV=production`, `JWT_SECRET` (chuỗi ngẫu nhiên mạnh), `CORS_ORIGIN` (domain HTTPS của Frontend Vercel), và các biến `SEPAY_*`, `VIETQR_*`.
   - **Frontend Service (`apps/web` trên Vercel):** Thiết lập `NEXT_PUBLIC_API_URL` trỏ về domain HTTPS của Backend API trên Render.
2. **Kích hoạt phát hành lên `main`:**
   - Merge Pull Request từ `develop` vào `main` (sau khi CI xanh) hoặc gắn tag phát hành:
     ```bash
     git checkout main
     git pull origin main
     git tag -a v1.0.0 -m "Release BrewLite v1.0.0"
     git push origin v1.0.0
     ```
3. **Thực thi Safe Migration & Khởi tạo dữ liệu mẫu lần đầu:**
   ```bash
   # Áp dụng Prisma Migrations chính thức trên Production
   npm run prisma:deploy --workspace=@brewlite/api

   # (Chỉ chạy 1 lần khi DB trống) Khởi tạo dữ liệu mẫu 15 sản phẩm, 12 nguyên liệu, 6 topping, 4 promo
   npm run db:seed --workspace=@brewlite/api
   ```
4. **Kiểm tra sau triển khai (Smoke Test):**
   ```bash
   # Kiểm tra Backend API Healthcheck & kết nối Database (HTTP 200)
   curl -f https://<api-production-domain>/health

   # Kiểm tra Frontend Web phục vụ qua HTTPS (HTTP 200)
   curl -I https://<web-production-domain>/menu
   ```

### 6.4. Thông Tin Bàn Giao Production & Demo (Task 5.4)

| Hạng mục bàn giao | Giá trị / Liên kết | Trạng thái |
| :--- | :--- | :--- |
| **Frontend Web (Vercel HTTPS)** | `https://<brewlite-web>.vercel.app/menu` *(Cập nhật URL thực tế sau khi deploy `main`)* | ⏳ Chờ deploy `main` |
| **Backend API (Render HTTPS)** | `https://<brewlite-api>.onrender.com/health` *(Cập nhật URL thực tế sau khi deploy `main`)* | ⏳ Chờ deploy `main` |
| **Release Tag & Notes** | `v1.0.0` ([`CHANGELOG.md`](./CHANGELOG.md)) | ⏳ Gắn tag khi merge `main` |
| **Video Demo E2E Flow** | `<link-video-demo>` *(Ghi hình luồng Order → QR → Webhook → Kitchen → Inventory)* | ⏳ Chờ quay sau deploy |

#### Phương án B: Triển khai Trực tiếp từ Container Registry trên VPS / Server Docker

```bash
# 1. Đăng nhập GitHub Container Registry (PAT cần quyền read:packages)
echo $CR_PAT | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin

# 2. Kéo phiên bản image cần triển khai (khuyên dùng tag sha-<commit> hoặc vX.Y.Z thay vì latest)
docker pull ghcr.io/buihoangviet2982006-dotcom/brewlite-api:v1.0.0
docker pull ghcr.io/buihoangviet2982006-dotcom/brewlite-web:v1.0.0

# 3. Chạy Backend API (lắng nghe cổng 4000)
docker run -d \
  --name brewlite-api \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file .env.production \
  ghcr.io/buihoangviet2982006-dotcom/brewlite-api:v1.0.0

# 4. Chạy Frontend Web (lắng nghe cổng 3000 sau Reverse Proxy Nginx/Caddy/Cloudflare HTTPS)
docker run -d \
  --name brewlite-web \
  --restart unless-stopped \
  -p 3000:3000 \
  ghcr.io/buihoangviet2982006-dotcom/brewlite-web:v1.0.0
```

---

### 6.4. Quy Trình Quay Lui Khẩn Cấp (Rollback Guide)

**Khi nào cần kích hoạt Rollback?**
- Smoke Test sau deploy thất bại (API không phản hồi hoặc lỗi `5xx` liên tục).
- Lỗi logic nghiêm trọng trên Production (tính sai tổng đơn, lỗi trừ kho hoặc lỗi nhận Webhook SePay).
- Sự cố migration cơ sở dữ liệu làm gián đoạn truy vấn của phiên bản hiện hành.

#### Cách 1: Rollback Tức Thời bằng Docker Image Tag Bất Biến (Khuyên dùng — MTTR < 2 phút)

Vì mọi lần build CD đều lưu lại tag `sha-<short_commit>` và SemVer `vX.Y.Z` trên GHCR/Docker Hub, bạn có thể đưa hệ thống về bản ổn định trước đó mà không cần chờ rebuild mã nguồn:

```bash
# 1. Xác định tag commit ổn định liền trước (ví dụ: sha-a1b2c3d hoặc v1.0.0)
export PREV_TAG=sha-a1b2c3d

# 2. Kéo lại image ổn định từ GHCR
docker pull ghcr.io/buihoangviet2982006-dotcom/brewlite-api:${PREV_TAG}
docker pull ghcr.io/buihoangviet2982006-dotcom/brewlite-web:${PREV_TAG}

# 3. Dừng và thay thế các container đang gặp sự cố
docker stop brewlite-api brewlite-web
docker rm brewlite-api brewlite-web

docker run -d \
  --name brewlite-api \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file .env.production \
  ghcr.io/buihoangviet2982006-dotcom/brewlite-api:${PREV_TAG}

docker run -d \
  --name brewlite-web \
  --restart unless-stopped \
  -p 3000:3000 \
  ghcr.io/buihoangviet2982006-dotcom/brewlite-web:${PREV_TAG}

# 4. Xác minh lại dịch vụ sau khi rollback
curl -f http://localhost:4000/products
```

> Trên **Render / Vercel**, có thể thực hiện thao tác tương đương trong 1 chạm thông qua chức năng **Manual Rollback / Redeploy previous commit** trên Dashboard của từng dịch vụ.

#### Cách 2: Rollback Mã Nguồn qua Git (`git revert`) để đồng bộ với CI/CD

Sau khi xử lý nóng hoặc khi muốn pipeline CD tự động phát hành lại bản sạch trên nhánh `main`:

```bash
# 1. Kiểm tra lịch sử commit gần nhất trên main
git checkout main
git pull origin main
git log --oneline -n 5

# 2. Tạo commit đảo ngược thay đổi gây lỗi (tránh dùng git reset --hard -f trên nhánh protected)
git revert <bad-commit-sha> --no-edit

# 3. Đẩy lên GitHub để CI/CD tự động build image mới và kích hoạt deploy
git push origin main
```

#### Cách 3: Xử Lý & Khôi Phục Database Migration Khi Gặp Lỗi (Prisma)

* **Nguyên tắc phòng ngừa (Expand-and-Contract):** Không xóa cột/bảng đang được bản cũ sử dụng trong cùng một release; luôn ưu tiên migration tương thích ngược (thêm cột nullable trước) để code cũ vẫn chạy được nếu cần rollback ứng dụng.
* **Khôi phục khi `prisma migrate deploy` bị lỗi giữa chừng:**
  ```bash
  # 1. Đánh dấu migration bị lỗi là đã rollback để mở khóa bảng _prisma_migrations
  npx prisma migrate resolve --rolled-back "<ten_migration_bi_loi>" --schema=apps/api/prisma/schema.prisma

  # 2. Nếu có thay đổi phá vỡ dữ liệu, khôi phục từ bản sao lưu (pg_dump) trước khi deploy:
  psql "$DATABASE_URL" < backup_before_deploy.sql
  ```
* **Sao lưu nhanh trước mỗi đợt nâng cấp schema Production:**
  ```bash
  pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

---

## 🌿 7. Chiến Lược Phân Nhánh Git, Pull Request, Commit & Definition of Done (Task 4.1)

> 📄 Xem tài liệu quy định chi tiết tại: **[`docs/development-workflow.md`](./docs/development-workflow.md)**

### 7.1. Chiến lược Branch (Simplified Gitflow)

```text
main (Production / Release sau mỗi Sprint Review — Protected)
  │
  └── develop (Nhánh tích hợp trung tâm của Sprint)
        ├── docs/<task-name>               # Tài liệu yêu cầu, sơ đồ UML, ADR, Release Notes
        ├── feat/<task-id>-<short-desc>    # Tính năng mới FE/BE (VD: feat/task4.3-api-products)
        ├── fix/<scope>-<short-desc>       # Sửa lỗi giao diện / logic nghiệp vụ
        ├── test/<task-id>-<short-desc>    # Bổ sung Unit, Integration, E2E test
        └── ci/<short-desc>                # Cấu hình GitHub Actions CI/CD, Docker
```

* **`hotfix/<tên-lỗi>`:** Nhánh sửa lỗi khẩn cấp tách từ `main` và merge lại vào cả `main` lẫn `develop`.

### 7.2. Quy trình Pull Request & CI Quality Gate

1. Mọi thay đổi mã nguồn (`apps/*`, `tests/*`) hoặc tài liệu (`docs/*`) **bắt buộc phải tạo Pull Request** vào `develop` theo mẫu [`.github/pull_request_template.md`](./.github/pull_request_template.md).
2. Khi mở PR, GitHub Actions (`.github/workflows/ci.yml`) tự động chạy:
   $$\text{Install} \longrightarrow \text{Prisma Generate} \longrightarrow \text{Lint} \longrightarrow \text{Unit Test} \longrightarrow \text{Build}$$
3. **Quy tắc chặn Merge:** Không được merge nếu `Lint`, `Test` hoặc `Build` thất bại, hoặc chưa có ít nhất **01 thành viên** review và `Approve`.

### 7.3. Quy ước Commit (Conventional Commits)

```text
<type>(<scope>): <mô tả ngắn gọn thay đổi>
```

* **`<type>`:** `feat`, `fix`, `docs`, `test`, `ci`, `refactor`, `chore`.
* **Ví dụ thực tế:**
  * `feat(api): implement GET /products/:id endpoint (Task 4.3)`
  * `feat(auth): implement registration, login and JWT protection (FR-04, NFR-02)`
  * `docs(release): add security audit report and v1.0.0 release notes (Task 5.4)`
  * `docs(readme): complete local setup, test, build, deploy and rollback guide (Task 5.4)`

### 7.4. Định nghĩa Hoàn thành — Definition of Done (DoD)

Một User Story / Task chỉ được chuyển sang **`Done`** khi thỏa mãn đủ:
1. **Nghiệp vụ & Thiết kế:** Đáp ứng 100% Tiêu chí chấp nhận của `FR-xx` / `NFR-xx` trong SRS; nhất quán với sơ đồ UML và Prisma Schema.
2. **Chất lượng Frontend & Backend:** UI Mobile-First xử lý đủ 4 trạng thái (`loading`, `empty`, `error`, `success`); API kiểm tra đầu vào (`ValidationPipe`), bảo vệ route nhạy cảm (`JwtAuthGuard`), giao dịch an toàn (`Prisma.$transaction` + `Idempotency-Key`), không lộ secret.
3. **Kiểm thử & CI Gate:** Vượt qua toàn bộ `npm run lint`, `npm run test` và `npm run build` trên CI Pipeline.
4. **Truy vết & Tài liệu:** Cập nhật đầy đủ vào [`docs/traceability-matrix.md`](./docs/traceability-matrix.md) và [`README.md`](./README.md).

---

## 📋 8. Product Backlog & Lộ Trình Sprint (Sprint 1 & Sprint 2)

> 📊 Xem bảng Issue Board (Kanban) và chi tiết từng User Story tại: **[`docs/product-backlog.md`](./docs/product-backlog.md)**

| Giai đoạn | Sprint Goal | Phạm vi Hạng mục chính | Tổng Story Points |
| :--- | :--- | :--- | :---: |
| **Sprint 1**<br>*(Task 1 – Task 4)* | Nền tảng Monorepo, tài liệu có kiểm soát phiên bản, CI tự động và MVP xem menu. | • **Task 1:** Bối cảnh, Stakeholder, SRS (`FR-01`..`FR-10`, `NFR-01`..`NFR-03`), Use-case Checkout (`#S1-01`..`#S1-03`).<br>• **Task 2:** Activity, Sequence & Domain Class Diagrams (`#S1-04`, `#S1-05`).<br>• **Task 3:** Kiến trúc C4/Layered, ADR `001`–`004` & Deployment Diagram (`#S1-06`, `#S1-07`).<br>• **Task 4:** Monorepo, MVP Menu (`GET /products`, `GET /products/:id`, UI Menu Mobile-First, Seed DB, Tests) & CI Pipeline (`#S1-08`..`#S1-12`). | **36 pts** |
| **Sprint 2**<br>*(Task 5 & Truy vết)* | Luồng End-to-End hoàn chỉnh, kiểm thử tích hợp/E2E, tự động hóa CD và triển khai Production HTTPS. | • **Task 5.1:** Chi tiết món (Size/Topping), Giỏ hàng Zustand, Auth JWT, Đặt đơn + Transaction trừ kho, Thanh toán Ví/Thẻ/VietQR + `Idempotency-Key`, Lịch sử đơn, Khuyến mãi & Loyalty (`#S2-01`..`#S2-07`).<br>• **Task 5.2:** Unit/Integration/E2E Tests, hoàn thiện Docker & Health Check (`#S2-08`, `#S2-09`).<br>• **Task 5.3 & 5.4:** CD Pipeline (Docker Image, Registry, Deploy Production, Safe Migration, Smoke Test, Rollback) & Bàn giao (`#S2-10`, `#S2-11`). | **53 pts** |

---

## 📑 9. Danh Mục Tài Liệu & Truy Vết Nhanh (Documentation Index)

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
- **Task 4 & Task 5 – Quy trình, Backlog, CI/CD, Bảo mật, Phát hành & Truy vết:**
  - [Task 4.1 – Quy trình Branch, Pull Request, Commit & Definition of Done](./docs/development-workflow.md)
  - [Task 4.1 – Product Backlog & Issue Board (Sprint 1 & Sprint 2)](./docs/product-backlog.md)
  - [Task 4.4 – Minh chứng triển khai Continuous Integration (CI)](./docs/ci-evidence.md)
  - [Task 5.3 & 5.4 – Hướng dẫn Đóng gói Docker Image & Container Registry](./docs/deployment.md)
  - [Task 5.3 – Chiến lược Rollback Tự động & An toàn](./docs/deployment/rollback-strategy.md)
  - [Task 5.4 – Tổng kết Sprint Review & Retrospective (Sprint 1 & Sprint 2)](./docs/sprint-review-retrospective.md)
  - [Task 5.4 – Báo cáo rà soát bảo mật Repository & CI/CD Logs](./docs/security-audit.md)
  - [Task 5.4 – Nhật ký phát hành & Release Notes (`v1.0.0`)](./CHANGELOG.md)
  - [Task 8.1 – Ma trận truy vết yêu cầu (Traceability Matrix)](./docs/traceability-matrix.md)
