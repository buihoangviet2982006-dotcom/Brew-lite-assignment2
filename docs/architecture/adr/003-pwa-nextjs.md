# ADR 003: Sử dụng Next.js theo hướng Mobile-first kết hợp PWA cho Frontend

- **Trạng thái (Status):** Accepted (Đã chấp nhận)
- **Ngày quyết định (Date):** Tháng 11/2026
- **Người đề xuất & Phụ trách:** Nguyễn Quang Đạt (TV3)
- **Thành viên tham gia quyết định:** Bùi Hoàng Việt (TV1), Đinh Đào Thái Sơn (TV2), Nguyễn Quang Đạt (TV3)
- **Thành phần liên quan:** `apps/web` (Frontend), Node `Thiết bị người dùng (Browser/PWA)` và `CDN/Next.js service` trong Deployment Diagram.

---

## 1. Bối cảnh và Vấn đề (Context and Problem Statement)

Hệ thống **BrewLite** là nền tảng đặt đồ uống phục vụ luồng nghiệp vụ khép kín từ: `Xem menu` -> `Chọn tùy chọn (size, topping)` -> `Giỏ hàng` -> `Đặt đơn` -> `Thanh toán` -> `Theo dõi đơn`.

Trong bối cảnh thực tế tại cửa hàng đồ uống:
- Đa số khách hàng sử dụng điện thoại thông minh (smartphone) để quét mã hoặc truy cập đường dẫn đặt món trực tiếp tại bàn hoặc đặt từ xa.
- Khách hàng mong muốn thao tác chọn món và thanh toán diễn ra nhanh chóng trong vài chục giây mà **không muốn phải tải và cài đặt ứng dụng nặng nề** từ App Store hay Google Play.
- Về phía nhóm phát triển (6 thành viên thực hiện trong 2 Sprint), hệ thống cần một kiến trúc Frontend hiện đại, đồng bộ ngôn ngữ TypeScript với Backend **NestJS** (`apps/api`) trong cùng một **Monorepo** (theo `ADR 001`), dễ dàng viết Unit Test / E2E Test và đóng gói Docker để triển khai tự động qua pipeline CI/CD.

Vấn đề đặt ra là lựa chọn công nghệ và kiến trúc giao diện cho `apps/web` sao cho vừa thỏa mãn ràng buộc kỹ thuật bắt buộc của dự án, vừa tối ưu hiệu năng, trải nghiệm di động và khả năng kiểm thử.

---

## 2. Các Yếu tố Thúc đẩy Quyết định (Decision Drivers)

1. **Ràng buộc cốt lõi của dự án:** Đề bài quy định rõ Frontend bắt buộc sử dụng **Next.js** theo hướng **Mobile-first/PWA** kết hợp cùng Backend **NestJS** và cơ sở dữ liệu **PostgreSQL**.
2. **Trải nghiệm người dùng trên di động (NFR - Usability & Performance):** Giao diện phải tải trang Menu nhanh, phản hồi mượt mà khi chọn `size`/`topping`, hiển thị rõ các trạng thái `loading` (skeleton/spinner), `empty`, `error` và có thể ghim lên màn hình chính điện thoại như một ứng dụng thực thụ.
3. **Đồng bộ kỹ thuật trong Monorepo (Maintainability):** Chia sẻ cùng hệ sinh thái TypeScript, quy tắc kiểm tra mã nguồn (`ESLint`), công cụ kiểm thử (`Jest`, `Playwright`/`Cypress`) với `apps/api`.
4. **Hỗ trợ quy trình CI/CD và Triển khai Production (Deployability):** Dễ dàng đóng gói thành Docker Image hoặc triển khai qua dịch vụ `CDN/Next.js service` có hỗ trợ giao thức bảo mật **HTTPS** và kiểm tra trạng thái hoạt động (Smoke Test / Health Check).

---

## 3. Các Phương án Được Cân nhắc (Considered Options)

1. **Phương án 1 (Được chọn):** Sử dụng **Next.js (App Router)** thiết kế theo chuẩn **Mobile-first** và tích hợp **Progressive Web App (PWA)**.
2. **Phương án 2:** Sử dụng Single Page Application (SPA) thuần túy phía Client (ví dụ: React + Vite CSR thông thường, không có SSR/PWA).
3. **Phương án 3:** Phát triển ứng dụng di động Native / Cross-platform riêng biệt (React Native / Flutter) bên cạnh trang Web.

---

## 4. Quyết định Kiến trúc (Decision Outcome)

Nhóm quyết định lựa chọn **Phương án 1: Xây dựng ứng dụng Frontend (`apps/web`) bằng Next.js theo hướng Mobile-first tích hợp PWA**.

### Các quy tắc thực thi đi kèm quyết định:
- **Kiến trúc kết xuất kết hợp (Hybrid Rendering):**
  - Sử dụng cấu trúc route của Next.js cho các màn hình nghiệp vụ (`/menu`, `/menu/[id]`, `/cart`, `/login`, `/register`, `/checkout`, `/orders`).
  - Sử dụng **Client Components** kết hợp với Client State Store cho các thành phần đòi hỏi tương tác thời gian thực cao như: bộ chọn `size`/`topping`, giỏ hàng tự động tính tổng tiền, kiểm tra hợp lệ form đăng nhập/đặt đơn và quản lý trạng thái thanh toán kèm khóa `Idempotency-Key`.
- **Chuẩn hóa Mobile-first & PWA:**
  - Thiết kế khung nhìn (Viewport) và bố cục giao diện ưu tiên màn hình điện thoại di động trước tiên.
  - Tích hợp tệp `manifest.json`, bộ biểu tượng ứng dụng (Icons) và Service Worker cơ bản để trình duyệt di động nhận diện BrewLite như một ứng dụng **PWA** độc lập.
- **Chuẩn hóa giao tiếp API:**
  - Mọi yêu cầu từ `Next.js UI` gửi tới `NestJS API` đều đi qua tầng dịch vụ (`services/`) sử dụng HTTPS, đính kèm JWT trong header `Authorization` cho các tác vụ yêu cầu xác thực và `Idempotency-Key` cho giao dịch thanh toán (tuân thủ chặt chẽ **Sequence Diagram Task 2.2**).

---

## 5. Phân tích Ưu điểm, Hạn chế và Sự Đánh đổi (Pros, Cons & Trade-offs)

### 5.1. Ưu điểm (Pros)
- **Truy cập tức thì (Zero-install friction):** Khách hàng chỉ cần mở URL HTTPS trên trình duyệt di động là có thể xem menu và đặt món ngay lập tức, đồng thời vẫn có tùy chọn cài đặt PWA ra màn hình chính.
- **Tối ưu tốc độ tải trang và trải nghiệm UI:** Next.js hỗ trợ chia nhỏ gói mã nguồn (Automatic Code Splitting) theo từng trang, kết hợp với cơ chế hiển thị `skeleton/spinner` giúp giảm thiểu thời gian chờ đợi của khách hàng trên mạng di động.
- **Phân công công việc rõ ràng trong nhóm:** Kiến trúc phân tách theo route và component của Next.js cho phép **TV3** (phụ trách Menu, Chi tiết sản phẩm, Giỏ hàng) và **TV4** (phụ trách Trạng thái UI, Đăng nhập/Đăng ký, Đặt đơn & Thanh toán, Lịch sử đơn) làm việc song song trên các nhánh Git riêng biệt mà không chồng chéo.
- **Tương thích hoàn hảo với CI/CD & Docker:** Quá trình chạy `Lint` -> `Unit Test` -> `Build` của Next.js giúp phát hiện sớm lỗi cú pháp và lỗi kiểu dữ liệu (TypeScript type-check) ngay khi mở Pull Request ở Task 4.4.

### 5.2. Hạn chế và Sự đánh đổi (Cons & Trade-offs)
- **Đánh đổi giữa PWA và Native App:**
  - *Lợi ích đạt được:* Chỉ cần duy trì một mã nguồn (Single Codebase) duy nhất tại `apps/web` cho mọi thiết bị (iOS, Android, Desktop), tiết kiệm tối đa thời gian phát triển trong khuôn khổ 2 Sprint.
  - *Chi phí đánh đổi:* PWA bị giới hạn quyền truy cập sâu vào phần cứng thiết bị (như Bluetooth tầm gần tại quầy hoặc một số tính năng thông báo đẩy nâng cao trên hệ điều hành di động đời cũ) so với ứng dụng Native. Tuy nhiên, các tính năng phần cứng này nằm ngoài phạm vi MVP (Out-of-scope) của BrewLite nên sự đánh đổi này là hoàn toàn hợp lý.
- **Đánh đổi trong quản lý trạng thái giữa Server và Client:**
  - *Lợi ích đạt được:* Kết hợp tốc độ tải của Next.js với sự linh hoạt của Client State (Giỏ hàng, JWT).
  - *Chi phí đánh đổi:* Đòi hỏi lập trình viên Frontend (TV3, TV4) phải phân định rõ ranh giới giữa Server Component và Client Component (`"use client"`), đồng thời xử lý đồng bộ trạng thái `hydration` để tránh lỗi sai lệch dữ liệu giữa lần tải đầu tiên và dữ liệu lưu trong bộ nhớ trình duyệt.

---

## 6. Lộ trình Hiện thực hóa qua 2 Sprint (Implementation Plan)

1. **Sprint 1 (Task 4.3 & Task 4.4):**
   - Khởi tạo ứng dụng Next.js trong `apps/web`, thiết lập cấu hình Mobile-first layout và PWA cơ bản.
   - Hiện thực màn hình Menu kết nối với API `GET /products` và `GET /products/:id` (TV3) cùng các trạng thái giao diện `loading`, `empty`, `error` (TV4).
   - Viết Unit Test tối thiểu cho Component hiển thị Menu và tích hợp vào pipeline CI.
2. **Sprint 2 (Task 5.1, Task 5.2, Task 5.3 & Task 5.4):**
   - Hoàn thiện UI chọn chi tiết sản phẩm (`size`, `topping`), quản lý Giỏ hàng và tính tổng tiền tự động (TV3).
   - Hoàn thiện UI Đăng ký/Đăng nhập (JWT), Đặt đơn & Thanh toán mô phỏng (có xử lý `Idempotency`), Xác nhận đơn, Theo dõi trạng thái & Lịch sử đơn (TV4).
   - Đóng gói Docker, chạy kiểm thử E2E (Playwright/Cypress) và triển khai lên môi trường Production thực tế qua HTTPS.