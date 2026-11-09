# ADR 004: Tích hợp Cổng Thanh toán Bên thứ ba (SePay & VietQR) Kết hợp Cơ chế Mô phỏng Kiểm thử và Xử lý Idempotency

* **Trạng thái:** Đã chấp nhận (Accepted)
* **Ngày quyết định:** 2026-11-09
* **Người tham gia:** Bùi Hoàng Việt, Đinh Đào Thái Sơn, Hoàng Gia Bảo, Nguyễn Quang Đạt,Trần Minh Trí

## 1. Bối cảnh (Context)
Dự án BrewLite cần hiện thực hóa trọn vẹn luồng nghiệp vụ mua hàng không dùng tiền mặt: Đặt đơn $\rightarrow$ Thanh toán $\rightarrow$ Xác nhận trạng thái đơn và hoàn trả tồn kho nếu giao dịch thất bại. Nhóm quyết định tích hợp dịch vụ bên thứ ba là **SePay** kết hợp chuẩn mã **VietQR** để mang lại trải nghiệm quét mã QR thanh toán sát với thực tế nhất tại Việt Nam.

Tuy nhiên, hệ thống cũng phải giải quyết 3 bài toán kỹ thuật bắt buộc của Assignment 2:
1. **Đáp ứng yêu cầu kiểm thử tự động (Task 5.2 & 5.3):** Pipeline CI/CD trên GitHub Actions phải tự động chạy được Integration Test và End-to-End (E2E) Test cho cả nhánh thanh toán thành công, thất bại và timeout (nhánh `alt` trên Sequence Diagram) mà không cần con người dùng điện thoại quét mã QR thật.
2. **Đáp ứng phạm vi MVP (Task 3.1 & 5.1):** Hỗ trợ đầy đủ phương thức chuyển khoản VietQR (qua SePay) lẫn mô phỏng Ví điện tử/Thẻ.
3. **Chống giao dịch trùng lặp (Idempotency):** Trên mạng di động, khách hàng có thể bấm nút "Thanh toán" nhiều lần liên tiếp, hoặc phía máy chủ SePay có thể gửi lặp lại (retry) cùng một Webhook khi mạng chập chờn.

## 2. Quyết định (Decision)

### 2.1. Thiết kế Kiến trúc Hybrid Payment Adapter (SePay + VietQR + Simulator)
Xây dựng `PaymentModule` trong NestJS theo mẫu thiết kế **Adapter Pattern**, kết nối với dịch vụ bên thứ ba **SePay / VietQR** và hỗ trợ song song chế độ mô phỏng kiểm thử:

1. **Khởi tạo Giao dịch & Sinh mã VietQR (`POST /api/v1/payments`):**
   - Khi khách hàng chọn thanh toán qua **VietQR (SePay)**, Backend tạo bản ghi `Payment` ở trạng thái `PENDING`, sinh mã tham chiếu thanh toán duy nhất (ví dụ: `BREW1024`) và trả về URL ảnh mã QR động theo chuẩn VietQR (`https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<TOTAL>&addInfo=BREW1024`).
   - Khi khách hàng chọn **Ví điện tử / Thẻ mô phỏng** (hoặc chạy trong môi trường CI Test), hệ thống kích hoạt bộ xử lý mô phỏng có tính xác định (Deterministic Simulation).

2. **Tiếp nhận và Xác thực Webhook từ SePay (`POST /api/v1/payments/sepay-webhook`):**
   - Khi khách hàng chuyển khoản thành công (hoặc kích hoạt từ SePay Sandbox / Webhook Simulator), SePay gọi HTTP POST tới endpoint Webhook của NestJS kèm header `Authorization: Apikey <SEPAY_WEBHOOK_SECRET>`.
   - Backend đối chiếu khóa bí mật, bóc tách mã đơn hàng (`BREW<OrderID>`) từ nội dung chuyển khoản (`content`), kiểm tra khớp số tiền (`transferAmount == order.totalAmount`) và cập nhật trạng thái `Payment` sang `SUCCESS`, đồng thời chuyển `Order` sang `PAID` và ghi nhận điểm thưởng `LoyaltyTransaction`.

3. **Quy tắc Kiểm thử Xác định (Deterministic Simulation Rules cho CI/CD & Ví/Thẻ):**
   Để phục vụ viết Integration Test và E2E Test tự động không phụ thuộc ngân hàng bên ngoài, `PaymentModule` hỗ trợ các quy tắc đầu vào cố định:

| Tham số / Kịch bản đầu vào | Hành vi của Payment Adapter & SePay Webhook | Kết quả trả về (Response) & Xử lý hệ thống |
| :--- | :--- | :--- |
| Chọn **VietQR (SePay)** và nhận Webhook hợp lệ từ SePay | Xác thực `SEPAY_WEBHOOK_SECRET`, kiểm tra `transferAmount` khớp tổng tiền đơn hàng. | `HTTP 200 OK` (`{"success": true}`). Đơn hàng chuyển sang `PAID`, cộng điểm `LoyaltyTransaction`. |
| Chọn **Ví/Thẻ** bình thường hoặc gọi `/payments/sepay-webhook/simulate` | Giả lập phản hồi callback thành công sau độ trễ mạng 300ms. | `HTTP 200 OK` (`status: "SUCCESS"`). Đơn hàng chuyển sang trạng thái `PAID`. |
| Truyền mã phương thức hoặc nội dung `"MOCK_FAIL"` | Giả lập giao dịch bị từ chối / số dư không đủ / sai số tiền chuyển khoản. | `HTTP 400 Bad Request` (`status: "FAILED"`). Giữ đơn hàng ở trạng thái chờ để khách thử lại. |
| Đơn hàng có tổng tiền kết thúc bằng đuôi `"99"` (vd: `59099` VNĐ) | Giả lập lỗi nghẽn mạng tới cổng bên thứ ba (Gateway Timeout). | `HTTP 504 Gateway Timeout`. Kích hoạt luồng Rollback: hủy giao dịch (`CANCELLED`) và hoàn trả tồn kho đồ uống. |

### 2.2. Cơ chế Chống Trùng lặp Hai chiều (Dual-Layer Idempotency Flow)
Hệ thống tận dụng trực tiếp các ràng buộc toàn vẹn (`@unique index`) của **PostgreSQL** để đảm bảo Idempotency ở cả hai chiều mà không cần cài đặt thêm Redis:

1. **Chiều Client $\rightarrow$ NestJS API (`Idempotency-Key`):**
   - Trước khi gửi yêu cầu `POST /payments`, ứng dụng Next.js sinh một chuỗi UUID v4 gắn vào HTTP Header `Idempotency-Key`.
   - Cột `idempotencyKey` trong bảng `Payment` được đánh `@unique`. Nếu Client gửi lặp lại yêu cầu do bấm đúp hoặc rớt mạng, Backend lập tức trả về thông tin giao dịch và mã VietQR đã tạo trước đó (`HTTP 200 OK`), không tạo bản ghi `Payment` thứ hai.
2. **Chiều SePay Webhook $\rightarrow$ NestJS API (`sepayTransactionId`):**
   - Dịch vụ SePay có cơ chế gửi lại (retry) Webhook nếu chưa nhận được phản hồi `200 OK` kịp thời.
   - Hệ thống lưu mã giao dịch của SePay (`id` trong payload Webhook) vào cột `externalTransactionId` (`@unique`) của bảng `Payment`. Nếu nhận được Webhook trùng mã giao dịch đã ở trạng thái `SUCCESS`, Backend bỏ qua bước xử lý nghiệp vụ và trả về ngay `HTTP 200 OK` để SePay dừng retry.

## 3. Các phương án đã cân nhắc (Alternatives Considered)
- **Chỉ dùng cổng thanh toán thật 100% (Không có chế độ mô phỏng):** Sẽ làm gãy pipeline CI/CD ở Task 4 và Task 5 vì GitHub Actions Runner không thể tự mở app ngân hàng quét mã QR thật khi chạy E2E Test.
- **Chỉ dùng hàm random giả lập nội bộ (Không tích hợp SePay/VietQR):** Thiếu tính thực tiễn khi demo sản phẩm trên môi trường Production và không thể hiện được kiến trúc kết nối hệ thống bên thứ ba qua Webhook.
- **Lưu Idempotency Key trên bộ nhớ RAM (In-memory Map):** Mất sạch dữ liệu khi Docker container khởi động lại, gây rủi ro ghi nhận trùng giao dịch.

## 4. Hệ quả & Đánh đổi (Consequences)
* **Tích cực:**
  - Trải nghiệm thực tế ấn tượng: Hiển thị mã VietQR chuẩn xác theo từng đơn hàng và tự động nhảy trạng thái đơn khi nhận Webhook từ SePay.
  - Vượt qua 100% bài kiểm thử tự động trên CI/CD nhờ kết hợp chế độ Deterministic Simulation.
  - Chống trùng lặp tuyệt đối ở cả bước khởi tạo thanh toán lẫn bước nhận Webhook callback.
* **Đánh đổi / Hạn chế:**
  - Cần cấu hình thêm các biến môi trường (`SEPAY_API_KEY`, `SEPAY_WEBHOOK_SECRET`, `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`) trên nền tảng Production và GitHub Secrets.