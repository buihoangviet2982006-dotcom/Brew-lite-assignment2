# Tài liệu Thiết kế Kiến trúc Hệ thống BrewLite

- **Tên dự án:** BrewLite – Nền tảng đặt đồ uống không dùng tiền mặt (Assignment 2)
- **Môn học:** Công nghệ Phần mềm – Khoa Công nghệ Thông tin, Trường Đại học Sài Gòn
- **Phiên bản:** 1.1 (Cập nhật tích hợp SePay/VietQR & UML Deployment Architecture)
- **Mô hình tiếp cận:** C4 Model (Context & Container), Monorepo, Modular Monolith (NestJS), Layered Architecture & Mobile-First PWA (Next.js)

---

## 1. Phương pháp Tiếp cận Kiến trúc & Bối cảnh Tổng thể

Hệ thống **BrewLite** được thiết kế nhằm hiện thực hóa luồng nghiệp vụ mua hàng liền mạch:
$$\text{Xem menu} \longrightarrow \text{Chọn tùy chọn (size, topping)} \longrightarrow \text{Giỏ hàng} \longrightarrow \text{Đặt đơn} \longrightarrow \text{Thanh toán} \longrightarrow \text{Theo dõi đơn}$$

Để cân bằng giữa tốc độ phát triển trong 2 Sprint ngắn hạn và chất lượng phần mềm dài hạn, nhóm lựa chọn mô hình **Client-Server tách biệt** kết hợp kiến trúc **Modular Monolith** ở phía Backend, được tổ chức trong một kho mã nguồn duy nhất (**Monorepo**):
- `apps/web`: Ứng dụng Web hướng Mobile-First & Progressive Web App (PWA) bằng Next.js.
- `apps/api`: Nền tảng API xử lý logic nghiệp vụ và giao dịch dữ liệu bằng NestJS.
- `docs/`: Toàn bộ tài liệu đặc tả (SRS), mô hình hóa (UML), kiến trúc (ADR) và ma trận truy vết.

### 1.1. Sơ đồ Ngữ cảnh và Phân tách Container (C4 Container Level)

```text
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|  [Khách hàng / Nhân viên quầy] (Mobile Browser / PWA Standalone Mode)                |
|  - Trình duyệt di động (iOS Safari / Android Chrome)                                 |
|  - Next.js Client Bundle & PWA Service Worker (Cache static assets, Manifest)        |
+---------------------------------------------------------------------------------------+
                                           │
                                           │ HTTPS (Port 443) / REST API + JWT Bearer
                                           ▼
+---------------------------------------------------------------------------------------+
|                                  APPLICATION TIER                                     |
|  [Edge Ingress / Reverse Proxy (Cloudflare CDN / Railway Cloud Ingress)]              |
|  - Định tuyến domain, kết thúc mã hóa TLS (TLS Termination), nén HTTP/Gzip           |
|                                           │
|             ┌─────────────────────────────┴─────────────────────────────┐
|             ▼ (Internal HTTP :3000)                                     ▼ (Internal HTTP :4000)
|  [apps/web: Next.js Server]                              [apps/api: NestJS Monolith]
|  - Server-Side Rendering (SSR: /menu)                    - Controllers & Validation Pipes
|  - Phục vụ Static HTML/CSS/JS Assets                     - JWT Authentication Guard
|                                                          - Modular Business Services
|                                                          - Health Check (/health)
+---------------------------------------------------------------------------------------+
                                           │
                      ┌────────────────────┴────────────────────┐
                      ▼ (TCP :5432 - Private Network)           ▼ (HTTPS :443 - Public Internet)
+---------------------------------------------+   +-------------------------------------+
|                  DATA TIER                  |   |     EXTERNAL THIRD-PARTY TIER       |
|  [PostgreSQL 16 Engine]                     |   |  [Cổng Thanh toán SePay & VietQR]   |
|  - Quản lý ACID Transaction (Đặt hàng/Kho)  |   |  - Sinh ảnh mã QR động (VietQR API) |
|  - Prisma ORM & Database Migration Scripts  |   |  - Bắn Webhook biến động số dư      |
|  - Persistent Storage (/var/lib/postgresql) |   |    (POST /payments/sepay-webhook)   |
+---------------------------------------------+   +-------------------------------------+
```

---

## 2. Lý do Lựa chọn Kiến trúc, Ưu điểm, Hạn chế và Đánh đổi (Trade-off)

| Tiêu chí | Nội dung chi tiết |
| :--- | :--- |
| **Lý do lựa chọn** | Phù hợp với năng lực triển khai thực tế của nhóm sinh viên qua 2 Sprint (4 tuần). Việc gom mã nguồn vào Monorepo và Backend theo Modular Monolith giúp chia sẻ định nghĩa kiểu dữ liệu (TypeScript Interfaces), cấu hình linting/testing thống nhất, và chỉ cần chạy một pipeline CI/CD tích hợp mà không tốn công sức vận hành hạ tầng phân tán. |
| **Ưu điểm** | 1. **Toàn vẹn giao dịch (ACID):** Cho phép thực thi các transaction phức tạp (tạo đơn hàng $\rightarrow$ trừ tồn kho đồ uống $\rightarrow$ khởi tạo thanh toán $\rightarrow$ cộng điểm thưởng) trực tiếp trên một cơ sở dữ liệu PostgreSQL duy nhất mà không cần giải pháp hai pha (2PC) hay Saga pattern.<br>2. **Đơn giản hóa môi trường phát triển:** Toàn bộ hệ thống có thể khởi chạy cục bộ tại máy lập trình viên chỉ bằng một lệnh duy nhất: `docker-compose up`.<br>3. **Độ trễ thấp:** Giao tiếp nội bộ giữa các module diễn ra trực tiếp qua bộ nhớ máy chủ (In-memory Service Call), loại bỏ độ trễ mạng so với Microservices. |
| **Hạn chế** | 1. **Rủi ro phụ thuộc tiến trình:** Toàn bộ các module nghiệp vụ Backend chạy chung một tiến trình Node.js; nếu một module gặp lỗi rò rỉ bộ nhớ (Memory Leak) hoặc CPU Spike, toàn bộ API có thể bị chậm hoặc dừng hoạt động.<br>2. **Quy mô cơ sở dữ liệu:** Toàn bộ hệ thống phụ thuộc vào một thực thể PostgreSQL vật lý duy nhất. |
| **Đánh đổi (Trade-off)** | **Chấp nhận hy sinh khả năng co giãn độc lập (Independent Scalability) của từng dịch vụ nhỏ để đổi lấy tốc độ hoàn thiện sản phẩm nhanh chóng, tính nhất quán dữ liệu tuyệt đối và chi phí bảo trì tối thiểu.** Nhờ cấu trúc tách biệt theo từng Domain Module trong NestJS, khi có yêu cầu mở rộng sau này, từng module vẫn có thể được bóc tách thành Microservice độc lập mà không cần viết lại toàn bộ mã nguồn. |

---

## 3. Kiến trúc Chi tiết Frontend: Next.js & Mobile-First PWA (`apps/web`)

Ứng dụng Frontend chịu trách nhiệm tương tác trực tiếp với khách hàng và nhân viên quầy, đặt trọng tâm vào thiết kế thích ứng di động và khả năng cài đặt như ứng dụng native qua Progressive Web App (PWA).

### 3.1. Cấu trúc Tổ chức Mã nguồn (`apps/web`)
Mã nguồn được tổ chức theo tính năng (Feature-based) kết hợp với **Next.js App Router**:

```text
apps/web/
├── public/
│   ├── icons/                      # Bộ Icon nhận diện PWA (192x192, 512x512)
│   ├── manifest.json               # Web App Manifest (Tên app, theme, display standalone)
│   └── sw.js                       # Service Worker đăng ký cache tài nguyên tĩnh
├── src/
│   ├── app/                        # Next.js App Router (Routing & Layouts)
│   │   ├── (auth)/                 # Nhóm Route xác thực tài khoản
│   │   │   ├── login/page.tsx      # Màn hình Đăng nhập (Client Component)
│   │   │   └── register/page.tsx   # Màn hình Đăng ký
│   │   ├── menu/                   # Nhóm Route xem thực đơn
│   │   │   ├── page.tsx            # Màn hình Thực đơn chính (Server Component - Sprint 1)
│   │   │   └── [id]/page.tsx       # Màn hình Chi tiết món, chọn size, topping (Sprint 2)
│   │   ├── cart/page.tsx           # Màn hình Giỏ hàng & tính tổng tiền (Sprint 2)
│   │   ├── checkout/page.tsx       # Màn hình Đặt đơn, hiển thị mã VietQR & Thanh toán (Sprint 2)
│   │   ├── orders/                 # Nhóm Route theo dõi đơn hàng
│   │   │   ├── page.tsx            # Lịch sử các đơn đã đặt
│   │   │   └── [id]/page.tsx       # Chi tiết & Trạng thái đơn thời gian thực
│   │   ├── layout.tsx              # Root Layout: Cấu hình Viewport di động, Bottom Navigation Bar
│   │   └── page.tsx                # Trang chủ (Tự động điều hướng vào /menu)
│   ├── components/                 # Các thành phần giao diện tái sử dụng
│   │   ├── ui/                     # Trạng thái UI chuẩn: Skeleton, Spinner, EmptyState, ErrorAlert
│   │   ├── menu/                   # ProductCard, CategoryFilter, ProductOptionSelector
│   │   ├── cart/                   # CartItemRow, CartSummary, PromotionInput
│   │   ├── checkout/               # CheckoutForm, PaymentMethodSelector, VietQrModal
│   │   └── orders/                 # OrderStatusBadge, OrderTimeline
│   ├── store/                      # Quản lý trạng thái Client (State Management)
│   │   ├── cart.store.ts           # Quản lý món trong giỏ, tự động tính tổng tiền
│   │   └── auth.store.ts           # Quản lý User Profile & JWT Token
│   ├── services/                   # Tầng tích hợp API
│   │   ├── api-client.ts           # Cấu hình Fetch/Axios, tự động gắn Header Bearer JWT & Correlation ID
│   │   ├── product.service.ts      # Gọi GET /products, GET /products/:id
│   │   ├── auth.service.ts         # Gọi POST /auth/login, POST /auth/register
│   │   ├── order.service.ts        # Gọi POST /orders, GET /orders/:id
│   │   └── payment.service.ts      # Gọi POST /payments kèm Header Idempotency-Key
│   ├── types/                      # Domain Interfaces đồng bộ 100% với Class Diagram (Task 2.3)
│   └── utils/                      # price-calculator.ts, idempotency.ts, validators.ts
├── Dockerfile                      # Cấu hình đóng gói Next.js Standalone Container
├── next.config.js                  # Cấu hình Next.js Output Standalone & PWA Plugin
└── package.json
```

### 3.2. Kiến trúc 4 Phân tầng trên Frontend (Frontend Layered Architecture)

```text
+-----------------------------------------------------------------------------------+
| 1. Presentation Layer (Pages & UI Components)                                     |
|    - App Router: Phân tách Server Components (SSR) và Client Components ('use client') |
|    - Xử lý triệt để 4 trạng thái giao diện: Loading, Empty, Error, Success        |
|    - Thiết kế Mobile-first với Bottom Navigation Bar và chuẩn Touch Target (>= 44px)   |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| 2. Application & State Management Layer (Client Store & Context)                  |
|    - Quản lý Giỏ hàng (Cart Store): Đồng bộ LocalStorage, phản hồi tức thời       |
|    - Quản lý Phiên (Auth Store): Kiểm soát Token, bảo vệ Route (/checkout, /orders)|
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| 3. Domain Logic & Pure Utilities Layer                                            |
|    - Tính giá tự động theo Size, Topping và Chiết khấu Khuyến mãi (Promotion)     |
|    - Sinh khóa duy nhất Idempotency-Key (UUID v4) cho mỗi phiên thanh toán        |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| 4. Data Access Layer (API Client Services)                                        |
|    - Giao tiếp với NestJS Backend qua giao thức HTTPS                             |
|    - Tự động gắn Authorization Header và bắt mã lỗi chuẩn hóa HTTP (401, 400, 500)|
+-----------------------------------------------------------------------------------+
```

### 3.3. Xử lý Trạng thái Giao diện & Công thức Tính toán Nghiệp vụ

1. **Quản lý 4 Trạng thái Giao diện Chuẩn:**
   - `loading`: Hiển thị giao diện khung xương (`MenuSkeleton`, `OrderSkeleton`) trong khi chờ API phản hồi.
   - `empty`: Hiển thị hình ảnh và thông báo trực quan (`EmptyState`) khi danh sách thực đơn rỗng hoặc giỏ hàng chưa có món.
   - `error`: Hiển thị thanh cảnh báo thân thiện (`ErrorAlert`) kèm nút "Tải lại trang" khi mất kết nối hoặc API phản hồi lỗi `5xx`/`4xx`.
   - `success`: Hiển thị danh sách thẻ sản phẩm tối ưu cho thao tác vuốt cuộn bằng một tay.
2. **Xử lý Hết hàng (Out of Stock):**
   - Khi `Product.isAvailable = false` hoặc `stockQuantity = 0`, nút đặt hàng chuyển sang trạng thái vô hiệu hóa (`disabled`), hiển thị nhãn "Hết hàng" đồng bộ với nhánh rẽ trên Activity Diagram (Task 2.1).
3. **Công thức Tính Tổng tiền Tự động (`price-calculator.ts`):**
   Đơn giá của từng món kèm các tùy chọn phụ thuộc:
   $$\text{ItemUnitPrice} = \text{BasePrice} + \text{SizeExtraPrice} + \sum_{i=1}^{n} \text{ToppingPrice}_i$$
   Tổng tiền từng dòng sản phẩm trong giỏ:
   $$\text{LineTotal} = \text{ItemUnitPrice} \times \text{Quantity}$$
   Tổng giá trị thanh toán cuối cùng sau khi áp mã khuyến mãi (`Promotion`):
   $$\text{Subtotal} = \sum \text{LineTotal}$$
   $$\text{FinalTotal} = \max(0, \text{Subtotal} - \text{DiscountAmount})$$

---

## 4. Kiến trúc Chi tiết Backend: NestJS Modular Monolith (`apps/api`)

Backend được thiết kế trên nền tảng **NestJS**, áp dụng nguyên tắc đóng gói theo Domain Module và cấu trúc phân lớp nghiêm ngặt, đảm bảo tính mở rộng và an toàn dữ liệu.

### 4.1. Cấu trúc Tổ chức Mã nguồn (`apps/api`)
```text
apps/api/
├── prisma/
│   ├── schema.prisma               # Định nghĩa các Data Model cốt lõi (Khớp Class Diagram Task 2.3)
│   ├── migrations/                 # Lịch sử các file SQL migration
│   └── seed.ts                     # Script nạp dữ liệu danh mục, sản phẩm & mã khuyến mãi mẫu
├── src/
│   ├── common/                     # Hạ tầng dùng chung toàn hệ thống
│   │   ├── filters/                # Global HttpExceptionFilter chuẩn hóa mã lỗi
│   │   ├── guards/                 # JwtAuthGuard, RolesGuard, SepayWebhookGuard
│   │   ├── interceptors/           # LoggingInterceptor (Structured JSON Logging)
│   │   └── middleware/             # CorrelationIdMiddleware (Gắn UUID cho từng Request)
│   ├── config/                     # Quản lý & Xác thực biến môi trường (@nestjs/config + Joi)
│   ├── modules/                    # Các Domain Module nghiệp vụ
│   │   ├── auth/                   # Quản lý User, Đăng ký, Đăng nhập, bcrypt, JWT, LoyaltyTransaction
│   │   ├── catalog/                # Quản lý Thực đơn, Product, tùy chọn Size/Topping, Tồn kho
│   │   ├── order/                  # Quản lý Order, OrderItem, áp dụng Promotion, vòng đời trạng thái
│   │   ├── payment/                # Tích hợp SePay Webhook, sinh VietQR, mô phỏng Ví/Thẻ & Idempotency
│   │   └── health/                 # Health check endpoint (/health) kiểm tra DB & Memory
│   ├── app.module.ts               # Module gốc kết nối các domain
│   └── main.ts                     # Điểm khởi chạy: Cấu hình CORS, ValidationPipe, Global Filter
├── Dockerfile                      # Đóng gói Node.js Production Container
└── package.json
```

### 4.2. Kiến trúc 3 Lớp (Layered Architecture) trong từng Module

```text
   HTTP Request (Header, Body, Params)
                 │
                 ▼
+-----------------------------------------------------------------------------------+
| 1. Presentation Layer (Controller & DTOs)                                         |
|    - Định tuyến API: Tiếp nhận Request, phân quyền qua @UseGuards(JwtAuthGuard)   |
|    - Xác thực hợp lệ dữ liệu đầu vào qua ValidationPipe (class-validator)         |
|    - Trả về HTTP Response theo chuẩn RESTful (200, 201, 400, 404, 500)            |
+-----------------------------------------------------------------------------------+
                 │
                 ▼
+-----------------------------------------------------------------------------------+
| 2. Business / Application Layer (Domain Services)                                 |
|    - Thực thi logic nghiệp vụ: Kiểm tra tồn kho sản phẩm, áp dụng Promotion       |
|    - Độc lập tính toán lại toàn bộ đơn giá đơn hàng (không tin tưởng giá từ Client)|
|    - Quản lý Database Transaction qua Prisma.$transaction                         |
+-----------------------------------------------------------------------------------+
                 │
                 ▼
+-----------------------------------------------------------------------------------+
| 3. Data Access Layer (Prisma Service / Persistence)                               |
|    - Giao tiếp trực tiếp với PostgreSQL qua kết nối Prisma Client an toàn         |
|    - Đảm bảo các ràng buộc Foreign Key, Unique Index và tính toàn vẹn thực thể    |
+-----------------------------------------------------------------------------------+
```

### 4.3. Quản lý Giao dịch Cơ sở dữ liệu (Database Transaction)
Khi khách hàng đặt đơn hàng (`POST /orders`), Service Layer thực thi một **Prisma Database Transaction** duy nhất để đảm bảo tính nguyên tố (Atomicity):
1. **Kiểm tra và Khóa tồn kho:** Kiểm tra số lượng tồn kho của từng sản phẩm trong giỏ hàng và tính hợp lệ của mã `Promotion` (nếu có).
2. **Khởi tạo bản ghi Đơn hàng:** Tạo mới một bản ghi trong bảng `Order` kèm các dòng chi tiết `OrderItem`.
3. **Cập nhật tồn kho:** Giảm số lượng khả dụng của đồ uống trong bảng `Product`.
4. **Khởi tạo giao dịch thanh toán:** Tạo bản ghi trong bảng `Payment` ở trạng thái `PENDING`.
$$\text{Nếu bất kỳ thao tác nào thất bại} \Longrightarrow \text{Rollback toàn bộ, không có dữ liệu rác nào được lưu lại.}$$

### 4.4. Chuẩn hóa Xử lý Ngoại lệ Toàn cục (Global Exception Handling)
Hệ thống sử dụng một bộ lọc ngoại lệ `HttpExceptionFilter` bao bọc toàn bộ ứng dụng, chuẩn hóa mọi phản hồi lỗi về định dạng JSON duy nhất:
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Sản phẩm Cà phê Trứng hiện tại đã hết hàng trong kho",
  "timestamp": "2026-11-09T14:30:00.000Z",
  "path": "/api/v1/orders",
  "correlationId": "8f9b2c34-7a1e-4c5d-9b12-123456789abc"
}
```

---

## 5. Cơ chế Lưu trữ Dữ liệu, Migration & Bền vững (PostgreSQL)

Hệ thống sử dụng **PostgreSQL 16** làm hệ quản trị cơ sở dữ liệu quan hệ chính, đảm bảo các tiêu chuẩn ACID khắt khe cho nghiệp vụ đặt hàng và giao dịch tài chính.

### 5.1. Mô hình Thực thể Dữ liệu Cốt lõi (Đồng bộ 100% với Class Diagram Task 2.3)
Các thực thể dữ liệu được định nghĩa trong `prisma/schema.prisma`, ánh xạ trực tiếp từ 7 lớp bắt buộc của **Class Diagram (Task 2.3)**:
1. **`User`:** Lưu trữ thông tin tài khoản, email, mật khẩu băm (`bcrypt`), tổng điểm tích lũy (`loyaltyPoints`) và vai trò (`CUSTOMER`, `STAFF`, `ADMIN`).
2. **`Product`:** Thông tin đồ uống, giá gốc (`basePrice`), cấu hình tùy chọn kích cỡ/topping (`options`), trạng thái sẵn sàng (`isAvailable`) và số lượng tồn kho (`stockQuantity`).
3. **`Order`:** Đơn hàng, tổng tiền gốc, số tiền giảm giá, tổng thanh toán cuối cùng, mã tham chiếu thanh toán (`paymentRef` dạng `BREW<ID>`) và trạng thái vòng đời:
   $$\text{PENDING} \longrightarrow \text{PAID} \longrightarrow \text{PREPARING} \longrightarrow \text{COMPLETED} \quad (\text{hoặc } \text{CANCELLED})$$
4. **`OrderItem`:** Chi tiết các món trong đơn, lưu trữ kích cỡ (`size`), danh sách `toppings` đã chọn .
5. **`Payment`:** Lưu trữ phương thức thanh toán (`VIETQR_SEPAY`, `EWALLET_MOCK`, `CARD_MOCK`), số tiền, URL mã VietQR (`qrCodeUrl`), khóa chống lặp của Client (`idempotencyKey @unique`), mã giao dịch bên thứ ba (`externalTransactionId @unique`) và trạng thái giao dịch (`PENDING`, `SUCCESS`, `FAILED`).
6. **`Promotion`:** Quản lý mã khuyến mãi (`code`), loại giảm giá (`PERCENTAGE`, `FIXED_AMOUNT`), giá trị giảm, hạn sử dụng và số lượt sử dụng tối đa.
7. **`LoyaltyTransaction`:** Lưu trữ lịch sử cộng/trừ điểm thưởng (`EARN`, `REDEEM`) của khách hàng gắn liền với từng đơn hàng thanh toán thành công.

### 5.2. Cơ chế Migration và Persistent Storage
1. **Quy trình Quản lý Phiên bản Cơ sở dữ liệu (Migration Workflow):**
   - **Tại môi trường Cục bộ (Local Development):** Lập trình viên chạy lệnh `npx prisma migrate dev --name <ten_thay_doi>`. Prisma tự động sinh các file SQL migration có đánh số thứ tự thời gian trong thư mục `prisma/migrations/` và lưu vết vào Git.
   - **Tại môi trường CI & Production (Automated Delivery):** Pipeline CI/CD tự động chạy lệnh `npx prisma migrate deploy` trước khi container API mới được khởi động. Cơ chế này áp dụng an toàn các thay đổi cấu trúc mà không gây mất mát dữ liệu hiện hành.
2. **Dữ liệu Mẫu Khởi tạo (Database Seeding):**
   - File script `prisma/seed.ts` được thiết lập sẵn các dữ liệu chuẩn về danh mục đồ uống, các tùy chọn size/topping, mã `Promotion` mẫu và tài khoản kiểm thử cho cả Sprint 1 (Menu) và Sprint 2 (Đơn hàng & Thanh toán).
3. **Lưu trữ Bền vững (Persistent Storage):**
   - Cấu hình Docker Production sử dụng Named Volume gắn kết với đường dẫn vật lý: `volumes: - pgdata:/var/lib/postgresql/data`. Dữ liệu nghiệp vụ và trạng thái đơn hàng luôn được bảo toàn trọn vẹn ngay cả khi container PostgreSQL bị khởi động lại hoặc nâng cấp phiên bản.

---

## 6. Dịch vụ Thanh toán Bên thứ ba (SePay & VietQR) & Cơ chế Idempotency

Như đã quyết định trong **ADR 004**, hệ thống kết hợp cổng thanh toán **SePay + VietQR** với bộ giả lập **Deterministic Simulation** nhằm vừa mang lại trải nghiệm quét QR thực tế, vừa đảm bảo kiểm thử tự động 100% trên CI/CD.

### 6.1. Thiết kế Bộ chuyển đổi Thanh toán (SePay & VietQR Payment Adapter)
Module thanh toán (`PaymentModule`) cung cấp 3 luồng xử lý chính:
1. **Sinh mã VietQR Động (`POST /api/v1/payments`):** Khi khách chọn phương thức `VIETQR_SEPAY`, hệ thống sinh chuỗi URL VietQR chuẩn Napas 247 chứa số tài khoản thụ hưởng, số tiền chính xác của đơn hàng và nội dung chuyển khoản định danh `BREW<OrderID>`.
2. **Nhận Webhook Xác nhận Tự động từ SePay (`POST /api/v1/payments/sepay-webhook`):**
   - Bảo vệ bởi `SepayWebhookGuard` kiểm tra header `Authorization: Apikey <SEPAY_WEBHOOK_SECRET>`.
   - Tự động đối chiếu số tiền thực nhận (`transferAmount`) với tổng tiền đơn hàng (`Order.totalAmount`). Nếu khớp, hệ thống chuyển trạng thái `Payment` sang `SUCCESS`, `Order` sang `PAID` và tạo bản ghi `LoyaltyTransaction` trong cùng một Database Transaction.
3. **Chế độ Mô phỏng Xác định cho Ví/Thẻ & CI/CD Test:** Hỗ trợ xử lý tức thời cho phương thức `EWALLET_MOCK` / `CARD_MOCK` và endpoint giả lập Webhook để kiểm thử tự động các kịch bản thành công, thất bại (`MOCK_FAIL` $\rightarrow$ `400 Bad Request`) và quá thời gian chờ (tổng tiền đuôi `99` $\rightarrow$ `504 Gateway Timeout` + Rollback tồn kho).

### 6.2. Cơ chế Idempotency Hai chiều (Dual-Layer Idempotency)
Để ngăn chặn tuyệt đối việc tạo giao dịch lặp từ phía người dùng hoặc cộng tiền hai lần khi SePay gửi lặp lại Webhook:

```text
[ Client (Next.js) ]                   [ NestJS PaymentModule ]               [ PostgreSQL ]          [ SePay / VietQR Cloud ]
         │                                        │                                  │                            │
         │ 1. POST /payments                      │                                  │                            │
         │ Header: Idempotency-Key: <UUID>        │                                  │                            │
         ├───────────────────────────────────────>│                                  │                            │
         │                                        │ Kiểm tra idempotencyKey (@unique)│                            │
         │                                        ├─────────────────────────────────>│                            │
         │                                        │                                  │                            │
         │   [Nếu Key đã tồn tại: Trả về ngay mã VietQR / Kết quả cũ (200 OK)]       │                            │
         │< - - - - - - - - - - - - - - - - - - - ┤                                  │                            │
         │                                        │                                  │                            │
         │   [Nếu Key chưa tồn tại: Tạo Payment PENDING & Sinh URL VietQR]           │                            │
         │<───────────────────────────────────────┤                                  │                            │
         │ 201 Created (Kèm qrCodeUrl: BREW1024)  │                                  │                            │
         │                                        │                                  │                            │
         │ 2. Khách quét mã QR chuyển khoản       │                                  │                            │
         ├────────────────────────────────────────┼──────────────────────────────────┼───────────────────────────>│
         │                                        │                                  │                            │
         │                                        │ 3. POST /payments/sepay-webhook  │                            │
         │                                        │ Header: Apikey <SECRET>          │                            │
         │                                        │ Body: { id: 9981, content: "BREW1024" }                       │
         │                                        │<─────────────────────────────────┼────────────────────────────┤
         │                                        │ Kiểm tra externalTransactionId   │                            │
         │                                        ├─────────────────────────────────>│                            │
         │                                        │ (Nếu chưa xử lý: Cập nhật PAID   │                            │
         │                                        │  + Cộng điểm LoyaltyTransaction) │                            │
         │                                        ├─────────────────────────────────>│ 200 OK {"success": true}   │
```

---

## 7. Giám sát Hoạt động, Logging & Quản lý Cấu hình (Observability & Config)

### 7.1. Quản lý Cấu hình Môi trường (12-Factor App)
- Mọi thông tin cấu hình nhạy cảm đều được tách biệt hoàn toàn khỏi mã nguồn và quản lý qua biến môi trường (`.env` tại local, GitHub Secrets và Platform Environment Variables tại Production).
- Sử dụng `@nestjs/config` kết hợp thư viện kiểm tra schema `Joi` để kiểm tra các biến bắt buộc ngay khi ứng dụng khởi chạy (`DATABASE_URL`, `JWT_SECRET`, `SEPAY_WEBHOOK_SECRET`, `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `PORT`, `FRONTEND_URL`...). Nếu thiếu biến bắt buộc, hệ thống tự động dừng tiến trình (fail-fast) và xuất thông báo lỗi rõ ràng.
- File mẫu `.env.example` được lưu trong kho mã nguồn để hướng dẫn thiết lập cho các thành viên mới.

### 7.2. Điểm Kiểm tra Sức khỏe Hệ thống (Health Check Endpoint)
Endpoint `GET /health` được xây dựng bằng gói `@nestjs/terminus`, chịu trách nhiệm kiểm tra sức khỏe của:
1. **HTTP Server Process:** Đảm bảo tiến trình ứng dụng vẫn đang lắng nghe và phản hồi request.
2. **PostgreSQL Connectivity:** Thực thi lệnh kiểm tra kết nối tới cơ sở dữ liệu (`SELECT 1`).
3. **Memory Heap Usage:** Cảnh báo nếu bộ nhớ RAM vượt ngưỡng an toàn cho phép.

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" }
  }
}
```
Endpoint này đóng vai trò quyết định trong việc thiết lập **Docker Healthcheck** và làm bước kiểm tra khói (**Smoke Test**) tự động trên Pipeline CI/CD sau khi triển khai bản Production.

### 7.3. Chiến lược Ghi log Có Cấu trúc (Structured JSON Logging)
- Tích hợp `LoggingInterceptor` tự động ghi nhận mọi truy vấn HTTP và sự kiện Webhook đi qua hệ thống.
- Log được xuất dưới định dạng JSON ra hai luồng chuẩn `stdout` (với mức `INFO`, `DEBUG`) và `stderr` (với mức `WARN`, `ERROR`), bao gồm các trường:
  `{"timestamp": "ISO8601", "correlationId": "UUID", "level": "INFO", "method": "POST", "url": "/api/v1/payments/sepay-webhook", "statusCode": 200, "responseTime": "18ms"}`
- Giải pháp này cho phép nền tảng đám mây tự động thu thập và lưu trữ log mà không cần ghi trực tiếp vào tệp tĩnh trên ổ cứng, đồng thời tuyệt đối không ghi các biến secret ra log.

---

## 8. Kiến trúc Triển khai & Ma trận Truy vết (Task 3.2 Deployment Architecture)

*(Sơ đồ UML Deployment Diagram chi tiết cùng mã nguồn PlantUML được đặt tại tệp `docs/deployment.md` và `docs/diagrams/deployment.puml`)*.

### 8.1. Phân định Ranh giới Giữa các Môi trường (Environment Boundaries)

Hệ thống được thiết lập phân định ranh giới rõ ràng giữa 3 môi trường phát triển và vận hành:
1. **Môi trường Phát triển Cục bộ (Local Development Boundary):** Chạy trên máy tính của lập trình viên thông qua `docker-compose.yml`, chứa 3 container nội bộ: `web-local` (cổng `3000`), `api-local` (cổng `4000`) và `db-local` (PostgreSQL 16 cổng `5432` gắn volume `pgdata-local`).
2. **Môi trường Tích hợp & Đóng gói (CI/CD & Container Registry Boundary):**
   - **GitHub Actions Runner:** Thực thi tự động quy trình kiểm tra chất lượng (`Install` $\rightarrow$ `Lint` $\rightarrow$ `Unit/Integration Test` $\rightarrow$ `Build`), đóng gói Docker Image gắn thẻ theo `commit SHA` (`brewlite-web:<sha>`, `brewlite-api:<sha>`).
   - **GitHub Container Registry (`ghcr.io`):** Lưu trữ tập trung và quản lý phiên bản các Docker Image đã vượt qua Quality Gate trước khi phân phối xuống môi trường Production.
3. **Môi trường Vận hành Thực tế (Production Boundary – Railway Cloud & Cloudflare CDN):**
   - **Cloudflare Edge / Cloud Ingress:** Cung cấp DNS, chứng chỉ HTTPS (TLS 1.3), CDN cache tài nguyên tĩnh PWA và Reverse Proxy điều hướng lưu lượng.
   - **Frontend (`web-container`):** Chạy container Next.js Standalone trên Railway Public Application Subnet.
   - **Backend (`api-container`):** Chạy container NestJS trên Railway, tiếp nhận request từ người dùng và nhận Webhook HTTPS từ **SePay Cloud**.
   - **Cơ sở dữ liệu (`db-instance`):** PostgreSQL 16 gắn ổ đĩa bền vững (`pgdata`) nằm trong **Private Data Subnet**, **hoàn toàn không mở cổng public ra ngoài Internet**.

### 8.2. Ma trận Giao thức Mạng, Cổng và Quản lý Bí mật (Secrets)

| Kết nối / Giao tiếp | Từ thành phần | Đến thành phần | Giao thức | Cổng kết nối | Quản lý Secret / Biến cấu hình |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Truy cập Người dùng** | Thiết bị di động / PWA | Cloudflare CDN / Ingress | HTTPS (TLS 1.3) | Port `443` | Chứng chỉ SSL tự động cấp phát |
| **Truy vấn Frontend SSR** | `web-container` (Next.js) | `api-container` (NestJS) | HTTP / REST | Port `4000` | Biến môi trường `API_INTERNAL_URL` |
| **Giao tiếp API Client** | Trình duyệt Client | `api-container` (qua Ingress)| HTTPS / REST | Port `443` | Biến `NEXT_PUBLIC_API_URL` |
| **Truy vấn Dữ liệu** | `api-container` (NestJS) | `db-instance` (PostgreSQL) | TCP / SSL (Prisma) | Port `5432` | Biến nhạy cảm `DATABASE_URL` (Secret) |
| **Sinh mã VietQR** | Trình duyệt / Next.js | Dịch vụ VietQR (`img.vietqr.io`) | HTTPS (GET) | Port `443` | Cấu hình `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO` |
| **Webhook Thanh toán** | Cổng thanh toán SePay | `api-container` (`/payments/sepay-webhook`) | HTTPS (POST) | Port `443` | Khóa bí mật `SEPAY_WEBHOOK_SECRET` |
| **Push/Pull Docker Image**| GitHub Actions / Railway | GitHub Container Registry (`ghcr.io`) | HTTPS | Port `443` | Token `GITHUB_TOKEN` / `REGISTRY_TOKEN` |
| **Kiểm tra Sức khỏe** | Health Monitor / CI Runner | NestJS Health Endpoint | HTTP / HTTPS | Port `4000/health`| Không yêu cầu xác thực |

### 8.3. Bảng Truy vết Thành phần Kiến trúc sang Triển khai & Mã nguồn (Traceability)

Bảng này đáp ứng trọn vẹn tiêu chí nghiệm thu của Task 3: *"Có thể truy vết mỗi container/dịch vụ trong deployment diagram đến một thành phần trong mô tả kiến trúc và mã nguồn"*:

| Container / Dịch vụ trên Deployment Diagram | Thành phần trong Mô tả Kiến trúc (Task 3.1) | Đường dẫn Mã nguồn & Cấu hình trong Repository | Trạng thái Nghiệm thu |
| :--- | :--- | :--- | :--- |
| **`web-container`** (Next.js PWA Service) | Kiến trúc Frontend (Mục 3) | `apps/web/` (`apps/web/Dockerfile`, `next.config.js`) | Phục vụ Menu (Sprint 1) & Đặt món (Sprint 2) |
| **`api-container`** (NestJS Modular Monolith) | Kiến trúc Backend (Mục 4) | `apps/api/` (`apps/api/Dockerfile`, `src/app.module.ts`)| Cung cấp API và xử lý giao dịch |
| **`db-instance`** (PostgreSQL 16 Engine) | Cơ chế Lưu trữ & Migration (Mục 5) | `apps/api/prisma/schema.prisma`, `docker-compose.yml` | Có Persistent Volume (`pgdata`) |
| **`ghcr.io`** (GitHub Container Registry) | Lưu trữ Docker Image (Mục 8.1) | `.github/workflows/cd.yml`, `apps/*/Dockerfile` | Lưu trữ image `brewlite-web` & `brewlite-api` |
| **`migration-runner`** (Prisma Deployer) | Cơ chế Migration tự động (Mục 5.2) | `apps/api/prisma/migrations/`, GitHub Actions CD | Thực thi `prisma migrate deploy` trước deploy |
| **`sepay-vietqr-service`** (External Payment & Adapter)| Dịch vụ Thanh toán SePay/VietQR & Idempotency (Mục 6)| `apps/api/src/modules/payment/` | Sinh mã VietQR, nhận SePay Webhook & giả lập test |
| **`health-probe`** (Health Check Endpoint) | Giám sát & Khả năng quan sát (Mục 7.2)| `apps/api/src/modules/health/` (`GET /health`) | Kiểm tra tiến trình và kết nối Database |
| **`ci-cd-runner`** (GitHub Actions Runner) | Tự động hóa Triển khai (Mục 8.1) | `.github/workflows/ci.yml`, `.github/workflows/cd.yml` | Kiểm thử, build Docker và triển khai tự động |

---

## 9. Danh mục Quyết định Kiến trúc (Architecture Decision Records - ADR)

Các quyết định công nghệ quan trọng được lưu vết chi tiết trong thư mục `docs/architecture/adr/`:
- [ADR 001: Sử dụng cấu trúc Monorepo cho toàn bộ dự án](./adr/001-monorepo.md)
- [ADR 002: Áp dụng kiến trúc Modular Monolith trên nền NestJS](./adr/002-modular-monolith-nestjs.md)
- [ADR 003: Quản lý dữ liệu quan hệ với PostgreSQL và Prisma Migration](./adr/003-postgresql-and-migration.md)
- [ADR 004: Tích hợp Cổng Thanh toán Bên thứ ba (SePay & VietQR) Kết hợp Cơ chế Mô phỏng Kiểm thử và Xử lý Idempotency](./adr/004-mock-payment.md)