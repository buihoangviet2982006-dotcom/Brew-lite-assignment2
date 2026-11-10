# Context and Scope

## 1. Vấn đề nghiệp vụ mà BrewLite cần giải quyết
* **Vấn đề nghiệp vụ:** Tại các cửa hàng cà phê giờ cao điểm, việc khách hàng xếp hàng chờ gọi món và thanh toán tiền mặt gây ùn tắc tại quầy, dễ sai sót khi ghi nhận tùy chọn (size, topping) và làm tăng thời gian chờ đợi.

---

## 2. Bảng phân tích Stakeholder

| STT | Stakeholder | Vai trò trong dự án | Mục tiêu chính | Kỳ vọng cụ thể đối với hệ thống BrewLite |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Khách hàng** | Người dùng cuối trực tiếp trải nghiệm ứng dụng để đặt món và thanh toán. | Đặt đồ uống nhanh chóng trên thiết bị di động mà không phải xếp hàng chờ đợi lâu tại quầy. | • Giao diện mobile-first/PWA mượt mà, dễ thao tác.<br>• Xem rõ menu, chi tiết món, chọn Size và Topping.<br>• Giỏ hàng tự động tính chính xác tổng tiền.<br>• Thanh toán Ví/Thẻ nhanh, không bị trừ tiền 2 lần (Idempotency).<br>• Theo dõi trạng thái đơn hàng realtime và xem lịch sử đơn. |
| **2** | **Nhân viên quầy / Pha chế** | Người tiếp nhận thông tin đơn hàng tại cửa hàng để pha chế và bàn giao cho khách. | Giảm tải việc ghi nhận đơn thủ công và tránh sai sót về công thức/tùy chọn món của khách. | • Chỉ tiếp nhận các đơn hàng đã được xác thực và thanh toán hợp lệ.<br>• Thông tin món, số lượng, Size và Topping hiển thị rõ ràng.<br>• Trạng thái đơn được đồng bộ nhất quán từ xác nhận đến hoàn tất. |
| **3** | **Quản lý cửa hàng** | Người quản trị vận hành, kiểm soát danh mục sản phẩm, tồn kho và doanh thu. | Tối ưu hóa quy trình bán hàng, kiểm soát tồn kho nguyên liệu và theo dõi hiệu quả kinh doanh. | • Hệ thống tự động kiểm tra và trừ tồn kho chính xác trong Database khi tạo đơn (chống overselling).<br>• Dữ liệu đơn hàng, thanh toán, khuyến mãi và tích điểm được lưu trữ toàn vẹn. |
| **4** | **Giảng viên / Khách hàng nghiệm thu** | Người đánh giá chất lượng học thuật, quy trình kỹ thuật và nghiệm thu sản phẩm qua các giai đoạn. | Kiểm chứng năng lực áp dụng quy trình Công nghệ Phần mềm từ đặc tả yêu cầu đến triển khai Production của nhóm. | • Tuân thủ quy trình tuần tự qua 5 Task, lịch sử commit/PR rõ ràng.<br>• Ma trận truy vết (`traceability-matrix.md`) nối từ Yêu cầu -> Use-case -> Sơ đồ -> Code -> Test.<br>• Hệ thống có đầy đủ Unit/Integration/E2E test, CI/CD tự động và URL Production hoạt động thực tế. |
| **5** | **Nhóm phát triển** | Nhóm 6 thành viên thiết kế, lập trình (FE/BE), kiểm thử và vận hành hệ thống (DevOps). | Xây dựng thành công hệ thống BrewLite đạt chuẩn kiến trúc, dễ bảo trì, dễ kiểm thử và hoàn thành đúng 2 Sprint. | • Kiến trúc Monorepo (`apps/web`, `apps/api`, `docs`, `tests`) phân tách rõ ràng.<br>• Môi trường chạy đồng bộ qua `docker-compose`, script Migration/Seed tái tạo Database nhanh chóng.<br>• Pipeline CI/CD phát hiện sớm lỗi Lint/Test/Build trước khi merge. |
| **6** | **Đơn vị thanh toán (Payment Service)** | Dịch vụ trung gian (mô phỏng Ví/Thẻ) kết nối với Backend để xử lý giao dịch. | Giao tiếp chuẩn xác, bảo mật với hệ thống BrewLite để xử lý lệnh thu tiền và phản hồi kết quả. | • Nhận yêu cầu thanh toán chuẩn từ NestJS API kèm khóa Idempotency-Key.<br>• Phản hồi rõ ràng kết quả thành công/thất bại để hệ thống cập nhật trạng thái đơn hàng. |

---

## 3. Xác định phạm vi dự án BrewLite

### 3.1. In-Scope (MVP)
- Xem danh sách menu đồ uống (hình ảnh, tên, giá, trạng thái còn hàng).
- Xem chi tiết sản phẩm, chọn Size (S/M/L) và Topping, tự động tính giá.
- Quản lý giỏ hàng (thêm, sửa số lượng, xóa, tính tổng tiền tạm tính).
- Đăng ký, đăng nhập người dùng và bảo vệ route bằng JWT.
- Tạo đơn hàng (PENDING), kiểm tra tồn kho và validate dữ liệu đầu vào.
- Thanh toán không tiền mặt qua Mock Payment Service (Ví điện tử / Thẻ ngân hàng).
- Hiển thị màn hình xác nhận đơn (mã đơn, trạng thái) và xem lịch sử đơn hàng cá nhân (`GET /orders/me`).

### 3.2. Phạm vi mở rộng (Future Scope)
- **Khuyến mãi & Ưu đãi:** Nhập mã voucher, áp dụng chiết khấu giảm giá trực tiếp vào tổng bill khi thanh toán.
- **Hệ thống khách hàng thân thiết:** Tích điểm theo giá trị đơn hàng, nâng hạng thành viên và dùng điểm quy đổi quà/giảm giá.
- **Cập nhật trạng thái thời gian thực:** Ứng dụng WebSocket/Server-Sent Events để tự động đẩy thông báo thay đổi trạng thái đơn (đang pha, hoàn tất) đến thiết bị khách hàng thay vì tải lại trang.
- **Giao diện dành cho nhân viên quầy & Quản lý:** Màn hình nhận đơn và cập nhật tiến độ pha chế tại quầy (KDS/Barista view). Trang quản trị cơ bản dành cho quản lý cửa hàng: quản lý danh mục món, đổi trạng thái bật/tắt món hết hàng.
- **Cổng thanh toán thực tế:** Nâng cấp từ dịch vụ thanh toán mô phỏng sang cổng thanh toán trực tiếp qua API ngân hàng/ví điện tử có đối soát thật.

### 3.3. Out-of-Scope (Không thực hiện)
- **Giao hàng tận nơi & Điều phối vận chuyển:** Không hỗ trợ tính phí ship qua GPS/bản đồ, không tích hợp đội ngũ giao hàng hoặc dịch vụ vận chuyển của bên thứ ba (Ahamove, Grab, v.v.). Hệ thống chỉ phục vụ mô hình khách tự đặt và nhận tại quầy (Pick-up / Take-away).
- **Thanh toán tiền mặt tại quầy (COD):** Không xử lý luồng tiền mặt thủ công nhằm giữ nguyên tiêu chí ứng dụng đặt món không tiền mặt (cashless ordering).
- **Tích hợp phần cứng POS vật lý:** Không lập trình điều khiển máy in bill chuyên dụng, két tiền tự động hoặc màn hình hiển thị phụ tại quầy.
- **Hệ thống chuỗi đa chi nhánh phức tạp:** Không hỗ trợ đồng bộ kho phân tán giữa nhiều chi nhánh; dữ liệu chỉ áp dụng cho một điểm bán duy nhất.
- **Kênh hỗ trợ trực tuyến (Live Chat / CSKH):** Không xây dựng khung chat trực tiếp giữa khách hàng với nhân viên hoặc tích hợp chatbot tự động.

---

## 4. Liệt kê và phân tích các giả định và ràng buộc của dự án

### 4.1. Giả định
- **Thiết bị và kết nối người dùng:** Khách hàng sử dụng thiết bị di động có trình duyệt web hiện đại hỗ trợ Progressive Web App (PWA) và có kết nối Internet ổn định trong suốt quá trình duyệt menu và đặt hàng.
- **Dịch vụ thanh toán:** Giai đoạn này sử dụng hệ thống thanh toán mô phỏng (sandbox/mock payment service), giả định phản hồi kết quả giao dịch diễn ra tức thì mà không cần thủ tục ký kết hợp đồng thương mại với cổng thanh toán thực.
- **Mô hình vận hành tại quầy:** Cửa hàng chỉ vận hành theo hình thức khách đặt trước và tự đến quầy nhận đồ uống (Pick-up / Take-away), không phát sinh giả định về tính phí giao hàng hoặc theo dõi shipper trên bản đồ.
- **Quy mô điểm bán:** Hệ thống phục vụ cho một cửa hàng BrewLite duy nhất với danh mục đồ uống và số lượng tồn kho nguyên liệu được quản lý tập trung, không phân tán đa chi nhánh.
- **Thời gian pha chế và xử lý đơn:** Nhân viên quầy và barista tiếp nhận và chuyển trạng thái đơn hàng theo quy trình tuần tự mà không gặp lỗi nghẽn vận hành vật lý tại quầy pha chế.

### 4.2. Ràng buộc

#### Ràng buộc công nghệ cốt lõi:
- Bắt buộc sử dụng **Next.js** theo định hướng mobile-first/PWA cho frontend.
- Bắt buộc sử dụng **NestJS** theo kiến trúc module/domain cho backend API.
- Bắt buộc sử dụng **PostgreSQL** làm hệ quản trị cơ sở dữ liệu chính và quản lý cấu trúc bằng cơ chế migration.
- Các thành phần này không được phép thay thế bằng công nghệ khác.

#### Ràng buộc bảo mật và môi trường triển khai:
- Toàn bộ ứng dụng production phải được phục vụ qua giao thức mã hóa HTTPS.
- Cơ sở dữ liệu PostgreSQL trên môi trường production tuyệt đối không được mở public trực tiếp ra Internet.
- Secret, biến môi trường, khóa API không được lưu trong repository hoặc để lộ trong log của CI/CD pipeline.
- API phải có cơ chế xác thực và bảo vệ các luồng nhạy cảm bằng JSON Web Token (JWT).

#### Ràng buộc quy trình và kiểm thử:
- Tuân thủ quy tắc thực hiện tuần tự 5 task; task sau chỉ được nghiệm thu khi tạo phẩm bắt buộc của task trước đã hoàn thành trên kho mã nguồn.
- Toàn bộ mã nguồn phải đi qua quy trình Pull Request và chỉ được merge khi vượt qua Quality Gate: Lint, Unit Test và Build tự động.
- Hệ thống phải có khả năng chạy local đồng bộ thông qua `docker-compose.yml` gồm cả ba dịch vụ: web, api và database.
- Phải đảm bảo tính bất biến (idempotency) khi xử lý các yêu cầu thanh toán gửi lại từ client.

---

## 5. Rủi ro ban đầu và các biện pháp giảm thiểu

### 5.1. Rủi ro xung đột dữ liệu tồn kho:
- *Mô tả:* Nhiều khách hàng cùng đặt một sản phẩm có số lượng giới hạn tại cùng một thời điểm, dẫn đến tình trạng bán âm tồn kho.
- *Giảm thiểu:* Thiết lập database transaction và áp dụng cơ chế khóa (locking mechanism) trong NestJS/PostgreSQL khi xử lý trừ số lượng hàng trong giỏ.

### 5.2. Rủi ro trùng lặp thanh toán:
- *Mô tả:* Mạng di động chập chờn khiến người dùng bấm thanh toán nhiều lần hoặc client tự động gửi lại request tạo đơn.
- *Giảm thiểu:* Thiết kế cơ chế Idempotency Key cho API checkout/payment nhằm bỏ qua hoặc trả về kết quả cũ nếu mã định danh giao dịch đã được tiếp nhận.

### 5.3. Rủi ro bảo mật token và thông tin cá nhân:
- *Mô tả:* Rò rỉ JWT secret hoặc dữ liệu khách hàng.
- *Giảm thiểu:* Lưu secret trong biến môi trường (`.env` / CI Secrets), truyền token qua HTTPS header, băm mật khẩu bằng `bcrypt`/`argon2`.

### 5.4. Rủi ro đứt gãy tính truy vết:
- *Mô tả:* Mã nguồn, API endpoint hoặc ca kiểm thử không đồng nhất với tài liệu đặc tả SRS và các sơ đồ UML (Activity, Sequence, Class).
- *Giảm thiểu:* Khởi tạo tệp `traceability-matrix.md` ngay từ đầu và cập nhật mã định danh (FR, NFR, Use-case, Test ID) song song trong mỗi lần tạo Pull Request.

### 5.5. Rủi ro lỗi tích hợp môi trường triển khai (CI/CD & Cloud Failure):
- *Mô tả:* Khác biệt giữa máy local và cloud.
- *Giảm thiểu:* Sử dụng Docker hóa toàn bộ ứng dụng và kiểm tra bằng Smoke Test (`/health`) trong CI/CD.