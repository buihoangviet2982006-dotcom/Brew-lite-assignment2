# Tài liệu Thiết kế Kiến trúc Frontend (Next.js & Mobile-first PWA)

- **Dự án:** BrewLite – Hệ thống đặt đồ uống (Assignment 2)
- **Thành phần hệ thống:** `apps/web` (Frontend Web / Progressive Web App)
- **Người phụ trách chính:** Nguyễn Quang Đạt (Thành viên 3 - TV3)
- **Phối hợp thiết kế:** Bùi Hoàng Việt (TV1 - Kiến trúc tổng thể), Đinh Đào Thái Sơn (TV2 - Kiến trúc Backend), Hoàng Gia Bảo (TV4 - UI/UX & Frontend)

---

## 1. Tổng quan Kiến trúc Frontend

Ứng dụng Frontend của **BrewLite** nằm tại thư mục `apps/web` trong cấu trúc Monorepo của toàn hệ thống. Ứng dụng được xây dựng bằng framework **Next.js** theo định hướng **Mobile-first** kết hợp **Progressive Web App (PWA)** nhằm mang lại trải nghiệm đặt đồ uống mượt mà, nhanh chóng ngay trên trình duyệt thiết bị di động mà không yêu cầu người dùng cài đặt ứng dụng từ chợ ứng dụng.

### 1.1. Mục tiêu kiến trúc
1. **Đáp ứng trọn vẹn luồng nghiệp vụ End-to-End:** Phục vụ xuyên suốt chuỗi hành động của khách hàng từ `Xem menu` -> `Chọn tùy chọn (size, topping)` -> `Giỏ hàng` -> `Đặt đơn` -> `Thanh toán` -> `Theo dõi đơn`.
2. **Tối ưu hóa cho thiết bị di động (Mobile-first & PWA):** Giao diện thích ứng hoàn hảo trên màn hình smartphone, hỗ trợ `manifest.json`, biểu tượng ứng dụng (App Icon) và cơ chế tải trang nhanh qua CDN.
3. **Đảm bảo các Yêu cầu Phi chức năng (NFR):**
   - **Hiệu năng (Performance):** Tối ưu thời gian tải trang lần đầu (First Contentful Paint) nhờ kết hợp Server Components và Client Components của Next.js, cùng hiệu ứng `skeleton/spinner` khi chờ dữ liệu.
   - **Tính khả dụng (Usability):** Xử lý rõ ràng mọi trạng thái giao diện (`loading`, `empty`, `error`), kiểm tra hợp lệ dữ liệu (validate form) tức thời.
   - **Bảo mật (Security):** Giao tiếp hoàn toàn qua giao thức HTTPS, quản lý JWT an toàn, không lưu thông tin nhạy cảm hoặc khóa bí mật (Secret) ở mã nguồn phía Client.
   - **Khả năng triển khai & Bảo trì (Deployability & Maintainability):** Đóng gói độc lập qua Docker, tích hợp chặt chẽ vào pipeline CI/CD (`Install` -> `Lint` -> `Unit Test` -> `Build` -> `Deploy`).

---

## 2. Cấu trúc Thư mục (`apps/web`)

Mã nguồn `apps/web` được tổ chức theo kiến trúc phân tách theo tính năng (Feature-based / Modular) kết hợp với **Next.js App Router**, giúp TV3 và TV4 dễ dàng phân chia công việc độc lập mà không xảy ra xung đột mã nguồn (merge conflict):

```text
apps/web/
├── public/
│   ├── icons/                      # Các kích thước icon cho PWA (192x192, 512x512)
│   ├── manifest.json               # Cấu hình Web App Manifest cho PWA
│   └── sw.js                       # Service Worker cơ bản phục vụ PWA
├── src/
│   ├── app/                        # Next.js App Router (Pages & Layouts)
│   │   ├── (auth)/                 # Nhóm route xác thực (TV4 phụ trách)
│   │   │   ├── login/page.tsx      # Màn hình Đăng nhập
│   │   │   └── register/page.tsx   # Màn hình Đăng ký
│   │   ├── menu/                   # Nhóm route thực đơn (TV3 phụ trách)
│   │   │   ├── page.tsx            # Màn hình Danh sách Menu chính (Sprint 1)
│   │   │   └── [id]/page.tsx       # Màn hình Chi tiết sản phẩm, chọn size/topping (Sprint 2)
│   │   ├── cart/
│   │   │   └── page.tsx            # Màn hình Giỏ hàng & tính tổng tiền (TV3 - Sprint 2)
│   │   ├── checkout/
│   │   │   └── page.tsx            # Màn hình Đặt đơn & Thanh toán mô phỏng (TV4 - Sprint 2)
│   │   ├── orders/
│   │   │   ├── page.tsx            # Màn hình Lịch sử đơn hàng (TV4 - Sprint 2)
│   │   │   └── [id]/page.tsx       # Màn hình Xác nhận & Theo dõi trạng thái đơn (TV4 - Sprint 2)
│   │   ├── layout.tsx              # Root Layout (Mobile-first viewport, Navbar/BottomBar)
│   │   └── page.tsx                # Trang chủ điều hướng vào Menu
│   ├── components/                 # Các Component tái sử dụng
│   │   ├── ui/                     # Các trạng thái UI dùng chung: Skeleton, Spinner, EmptyState, ErrorAlert (TV4)
│   │   ├── menu/                   # ProductCard, CategoryFilter, ProductOptionSelector (TV3)
│   │   ├── cart/                   # CartItemRow, CartSummary, PromoCodeInput (TV3)
│   │   ├── checkout/               # CheckoutForm, PaymentMethodSelector (TV4)
│   │   └── orders/                 # OrderStatusBadge, OrderTimeline, OrderHistoryCard (TV4)
│   ├── store/                      # Quản lý trạng thái phía Client (State Management)
│   │   ├── cart.store.ts           # State Giỏ hàng, thêm/sửa/xóa món, tự động tính tiền (TV3)
│   │   └── auth.store.ts           # State thông tin User & JWT Token (TV4)
│   ├── services/                   # Tầng giao tiếp REST API với NestJS Backend
│   │   ├── api-client.ts           # Cấu hình HTTP client, gắn Bearer JWT & xử lý lỗi tập trung
│   │   ├── product.service.ts      # Gọi GET /products, GET /products/:id (TV3)
│   │   ├── auth.service.ts         # Gọi POST /auth/register, POST /auth/login (TV4)
│   │   ├── order.service.ts        # Gọi POST /orders, GET /orders, GET /orders/:id (TV4)
│   │   └── payment.service.ts      # Gọi POST /payments kèm Idempotency-Key (TV4)
│   ├── types/                      # Định nghĩa Interface/Type đồng bộ với Class Diagram (Task 2.3)
│   │   └── domain.types.ts         # User, Product, Order, OrderItem, Payment, Promotion
│   └── utils/                      # Các hàm tiện ích
│       ├── price-calculator.ts     # Hàm tính giá món, size, topping, khuyến mãi (TV3)
│       ├── idempotency.ts          # Hàm sinh khóa Idempotency-Key (UUID) khi thanh toán
│       └── validators.ts           # Hàm kiểm tra dữ liệu form ở Frontend
├── tests/                          # Unit Test cho Component & Logic Frontend (Jest / React Testing Library)
├── Dockerfile                      # Cấu hình đóng gói container cho môi trường Production
├── next.config.js                  # Cấu hình Next.js & PWA
├── package.json
└── tsconfig.json
```

---

## 3. Kiến trúc Phân lớp trên Frontend (Frontend Layered Architecture)

Để đồng bộ với kiến trúc tổng thể của hệ thống (do TV1 thiết kế) và kiến trúc Backend NestJS (do TV2 thiết kế), ứng dụng `apps/web` được chia thành **4 tầng (layers)** tách biệt rõ trách nhiệm:

```text
+-----------------------------------------------------------------------+
| 1. Presentation Layer (Next.js Pages, Layouts, Mobile-first UI)       |
|    - Hiển thị giao diện, xử lý trạng thái Loading / Empty / Error      |
|    - Tiếp nhận thao tác người dùng và kiểm tra hợp lệ Form (Validate) |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 2. Application & State Management Layer (Client Store & Hooks)        |
|    - Quản lý Giỏ hàng (Cart State), tự động tính tổng tiền            |
|    - Quản lý phiên đăng nhập (JWT Auth), điều hướng bảo vệ Route      |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 3. Domain Model & Business Logic Layer (Types & Pure Functions)       |
|    - Ánh xạ thực thể từ Class Diagram (Product, Order, OrderItem...)  |
|    - Công thức tính tiền sản phẩm theo Size, Topping, Promotion       |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 4. Data Access / API Integration Layer (REST API Services)            |
|    - Giao tiếp với NestJS API qua HTTPS (GET /products, POST /orders) |
|    - Tự động đính kèm Header Authorization (JWT) & Idempotency-Key    |
+-----------------------------------------------------------------------+
```

---

## 4. Thiết kế Chi tiết các Module và Logic Nghiệp vụ

### 4.1. Module Menu & Chi tiết Sản phẩm (TV3 & TV4 phụ trách)
- **Danh sách Menu (Sprint 1 - Task 4.3):**
  - Khi người dùng truy cập màn hình Menu, Frontend gọi API `GET /products`.
  - Quản lý đầy đủ 4 trạng thái hiển thị bắt buộc:
    1. `loading`: Hiển thị khung xương tải dữ liệu (`MenuSkeleton` / `Spinner`) trong lúc chờ phản hồi từ Backend.
    2. `empty`: Hiển thị giao diện thông báo danh sách trống (`EmptyState`) nếu API trả về mảng rỗng `[]`.
    3. `error`: Hiển thị cảnh báo lỗi thân thiện kèm nút "Thử lại" (`ErrorAlert`) nếu mất kết nối hoặc API trả về mã lỗi `5xx` / `4xx`.
    4. `success`: Hiển thị lưới sản phẩm thiết kế tối ưu cho thao tác chạm bằng một tay trên màn hình di động.
- **Chi tiết Sản phẩm & Tùy chọn (Sprint 2 - Task 5.1):**
  - Gọi API `GET /products/:id` để lấy thông tin chi tiết món, trạng thái tồn kho, danh sách kích cỡ (`size`) và các loại `topping` đi kèm.
  - Nếu sản phẩm ở trạng thái **hết hàng** (Out of stock), nút "Thêm vào giỏ hàng" sẽ bị vô hiệu hóa (disabled) và hiển thị nhãn "Hết hàng" đúng theo nhánh rẽ trên **Activity Diagram (Task 2.1)**.

### 4.2. Module Giỏ hàng & Công thức Tính Tổng tiền Tự động (TV3 phụ trách - Task 5.1)
- Mỗi phần tử trong giỏ hàng tương ứng với lớp `OrderItem` trong **Class Diagram (Task 2.3)**, lưu trữ: thông tin `Product`, `size` đã chọn, danh sách `topping` đã chọn và số lượng (`quantity`).
- **Logic tính toán tự động tại Frontend (`price-calculator.ts`):**
  ```ts
  // 1. Đơn giá 1 sản phẩm kèm tùy chọn (ItemUnitPrice)
  ItemUnitPrice = BasePrice + SizeExtraPrice + Sum(ToppingPrice)

  // 2. Thành tiền của từng dòng sản phẩm trong giỏ (LineTotal)
  LineTotal = ItemUnitPrice * quantity

  // 3. Tổng tiền tạm tính của toàn bộ giỏ hàng (Subtotal)
  Subtotal = Sum(LineTotal)

  // 4. Tổng tiền thanh toán cuối cùng sau khuyến mãi (FinalTotal)
  FinalTotal = Math.max(0, Subtotal - DiscountAmount)
  ```
- Mọi thay đổi về số lượng, đổi size hoặc thêm/bớt topping đều kích hoạt tính lại `FinalTotal` tức thời trên giao diện mà không cần tải lại trang. Lưu ý: Khi gửi lên Backend tạo đơn, `NestJS API` sẽ tính toán và kiểm tra lại độc lập để đảm bảo an toàn dữ liệu.

### 4.3. Module Xác thực, Đặt đơn, Thanh toán & Xử lý Idempotency (TV4 phụ trách - Task 5.1)
- **Kiểm tra Xác thực (JWT Guard trên Frontend):**
  - Theo luồng **Activity Diagram (Task 2.1)**, khi khách hàng nhấn "Đặt đơn" từ Giỏ hàng, hệ thống kiểm tra trạng thái đăng nhập trong `auth.store.ts`.
  - Nếu **chưa đăng nhập**, Frontend lưu lại đường dẫn hiện tại và chuyển hướng người dùng sang trang `/login`, sau khi đăng nhập thành công và nhận `JWT` sẽ tự động đưa người dùng quay lại màn hình `/checkout`.
- **Luồng Đặt đơn & Thanh toán (Đồng bộ với Sequence Diagram - Task 2.2):**
  1. Kiểm tra hợp lệ dữ liệu (Validate form) tại Frontend trước khi gửi request.
  2. Gửi yêu cầu tạo đơn hàng tới `NestJS API` kèm theo header `Authorization: Bearer <JWT>`.
  3. Khi thực hiện thanh toán qua Ví/Thẻ mô phỏng (`POST /payments`), Frontend tự động sinh một mã định danh duy nhất `Idempotency-Key` (dạng UUID gắn với phiên thanh toán của đơn hàng đó) trong HTTP Header.
  4. **Cơ chế chống thanh toán trùng (Idempotency):** Nếu mạng chập chờn hoặc người dùng nhấn nút "Thanh toán" nhiều lần liên tiếp, hoặc bấm "Thử lại" cho cùng một yêu cầu, Frontend giữ nguyên `Idempotency-Key` cũ để `NestJS API` và `Payment Service` nhận diện và không trừ tiền hai lần.
  5. **Xử lý nhánh `alt` (Thành công / Thất bại):**
     - Nếu thanh toán thành công: Xóa giỏ hàng hiện tại, điều hướng sang màn hình **Xác nhận đơn & Theo dõi trạng thái đơn** (`/orders/[id]`).
     - Nếu thanh toán thất bại: Giữ nguyên thông tin đơn hàng, hiển thị thông báo lỗi cụ thể và cho phép người dùng chọn lại phương thức thanh toán hoặc thử lại.

---

## 5. Thiết kế Mobile-first & Cấu hình PWA

Để đáp ứng yêu cầu bắt buộc "Frontend sử dụng Next.js theo hướng mobile-first/PWA", ứng dụng được thiết kế với các tiêu chuẩn kỹ thuật sau:

1. **Thiết kế Giao diện Mobile-first (Responsive Breakpoints):**
   - Toàn bộ CSS/Tailwind được viết ưu tiên cho kích thước màn hình di động trước (`320px - 480px`), sau đó mới mở rộng lên Tablet (`md:`) và Desktop (`lg:`).
   - Sử dụng thanh điều hướng dưới đáy màn hình (**Bottom Navigation Bar**) cho phép chuyển nhanh giữa `Menu`, `Giỏ hàng` (kèm badge số lượng món) và `Đơn hàng`, giúp ngón cái thao tác dễ dàng trên điện thoại.
   - Các nút bấm hành động chính ("Thêm vào giỏ", "Đặt đơn", "Thanh toán") có chiều cao tối thiểu `44px - 48px` đảm bảo chuẩn chạm cảm ứng (Touch target).
2. **Cấu hình Web App Manifest (`public/manifest.json`):**
   - Khai báo đầy đủ `name: "BrewLite Coffee & Tea"`, `short_name: "BrewLite"`, `display: "standalone"`, `start_url: "/menu"`, `background_color`, `theme_color` và bộ icon chuẩn PWA để người dùng có thể "Thêm vào màn hình chính" (Add to Home Screen) và chạy toàn màn hình như ứng dụng thực thụ.
3. **Quản lý Biến môi trường & Bảo mật Kết nối:**
   - Chỉ sử dụng biến môi trường có tiền tố `NEXT_PUBLIC_API_URL` (khai báo mẫu trong `.env.example`) để trỏ tới địa chỉ của `NestJS API`.
   - Tuyệt đối không lưu trữ bất kỳ khóa bí mật (Secret) nào của hệ thống ở phía Frontend.

---

## 6. Đồng bộ hóa với Sơ đồ Hệ thống (Task 2) và Deployment (Task 3.2)

Bảng dưới đây đảm bảo tính nhất quán 100% giữa tài liệu kiến trúc Frontend với các tạo phẩm khác của nhóm để phục vụ lập **Ma trận truy vết (`docs/traceability-matrix.md`)**:

| Thành phần kiến trúc Frontend (`apps/web`) | Liên kết Yêu cầu (Task 1.2) | Liên kết Sơ đồ Hệ thống (Task 2) | Liên kết Backend API (`apps/api`) | Liên kết Deployment Diagram (Task 3.2) |
| :--- | :--- | :--- | :--- | :--- |
| Màn hình Menu & Trạng thái `loading`, `empty`, `error` | Nhóm FR Xem Menu & NFR Hiệu năng/Khả dụng | **Activity Diagram:** Làn `Customer` & `Next.js UI` (Bước Xem Menu) | `GET /products` | Node: `Thiết bị người dùng (Browser/PWA)` <-> `CDN/Next.js service` |
| Màn hình Chi tiết món (Chọn `size`, `topping`) | Nhóm FR Chi tiết sản phẩm | **Activity Diagram:** Bước Chọn tùy chọn & Nhánh rẽ *Hết hàng*<br>**Class Diagram:** Lớp `Product` | `GET /products/:id` | Node: `CDN/Next.js service` <-> `NestJS container` |
| Quản lý Giỏ hàng & Tính tổng tiền tự động | Nhóm FR Giỏ hàng | **Activity Diagram:** Bước Giỏ hàng<br>**Class Diagram:** Lớp `Order`, `OrderItem`, `Promotion` | Xử lý tại Client Store (`cart.store.ts`) | Chạy trên `Browser/PWA` của thiết bị người dùng |
| Màn hình Đăng ký / Đăng nhập & Quản lý JWT | Nhóm FR Xác thực & NFR Bảo mật | **Activity Diagram:** Nhánh rẽ *Chưa đăng nhập*<br>**Sequence Diagram:** Kiểm tra JWT<br>**Class Diagram:** Lớp `User` | `POST /auth/register`<br>`POST /auth/login` | Giao tiếp qua `HTTPS` giữa `Browser/PWA` và `NestJS container` |
| Màn hình Đặt đơn & Thanh toán (kèm `Idempotency-Key`) | Nhóm FR Đặt đơn & Thanh toán | **Sequence Diagram:** Lifeline `Customer` -> `Next.js UI` -> `NestJS API`, nhánh `alt`, cơ chế `Idempotency`<br>**Class Diagram:** Lớp `Order`, `Payment` | `POST /orders`<br>`POST /payments` | Kết nối nội bộ & HTTPS từ `Next.js service` tới `NestJS container` |
| Màn hình Xác nhận, Theo dõi trạng thái & Lịch sử đơn | Nhóm FR Lịch sử & Quản lý trạng thái đơn | **Activity Diagram:** Bước Theo dõi đơn<br>**Class Diagram:** Enum trạng thái của `Order` | `GET /orders`<br>`GET /orders/:id` | Node: `Browser/PWA` <-> `CDN/Next.js service` |

---

## 7. Chiến lược Kiểm thử (Testing) và Tích hợp CI/CD

1. **Unit Test (Task 4.3 & Task 5.2):**
   - Kiểm thử các Component hiển thị Menu (đảm bảo render đúng danh sách món và các trạng thái `loading`, `empty`, `error`).
   - Kiểm thử đơn vị cho hàm tính tổng tiền giỏ hàng (`price-calculator.ts`) với các tổ hợp `size`, `topping` và mã giảm giá khác nhau.
2. **End-to-End (E2E) Test (Task 5.2):**
   - Phối hợp cùng TV6 (QA) thiết lập kịch bản kiểm thử tự động bằng Playwright/Cypress trong thư mục `tests/`, mô phỏng người dùng thật đi từ màn hình Menu -> Chọn món -> Giỏ hàng -> Đăng nhập -> Đặt đơn & Thanh toán -> Xác nhận đơn.
3. **Quality Gate trên Pipeline CI/CD (Task 4.4 & Task 5.3):**
   - Mọi Pull Request thay đổi mã nguồn trong `apps/web` đều phải vượt qua các bước tự động trên GitHub Actions (`.github/workflows/`): `Install` -> `Lint` -> `Unit Test` -> `Build` trước khi được phép gộp (merge) vào nhánh chính.