# Đặc tả Luồng chính (Main Flow) Use-case: Đặt và thanh toán đơn hàng

## 1. Tóm tắt Use-case
1. **Tên Use-case:** Đặt và thanh toán đơn hàng (Order and Pay)
2. **Actor chính:** Khách hàng (Customer)
3. **Actor hỗ trợ:** Dịch vụ thanh toán (Payment Service)
4. **Trigger:** Khách hàng nhấn nút "Tiến hành đặt đơn" (Checkout) từ màn hình Giỏ hàng.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Ứng dụng đã kết nối mạng và dịch vụ Backend đang hoạt động bình thường.
2. Giỏ hàng của khách hàng có ít nhất $01$ sản phẩm.
3. Tất cả sản phẩm và topping trong giỏ hàng còn trạng thái bán (`isAvailable = true`) và còn đủ số lượng tồn kho.
4. Khách hàng đã đăng nhập tài khoản.

---

## 3. Hậu điều kiện (Post-conditions)

### Khi thành công:
1. Bản ghi Order được tạo trong PostgreSQL.
2. Trạng thái đơn hàng chuyển hợp lệ từ `PENDING` $\rightarrow$ `PAID`.
3. Tồn kho nguyên liệu bị trừ tương ứng trong Database.
4. Điểm thưởng thành viên và lượt sử dụng Voucher được ghi nhận.
5. Giỏ hàng client được làm trống; khách hàng được chuyển sang màn hình Xác nhận đơn hiển thị mã nhận đơn (`#id`) và mã QR để theo dõi tiến trình làm đồ uống.

### Khi thất bại (Hủy đơn hoặc lỗi thanh toán):
1. Đơn hàng chuyển sang trạng thái `PAYMENT_FAILED` hoặc `CANCELLED`.
2. Tồn kho nguyên liệu và điểm thưởng được hoàn trả nguyên trạng (Rollback).
3. Không có bất kỳ khoản tiền nào bị trừ khỏi tài khoản ví/ngân hàng của khách hàng.

---

## 4. Luồng sự kiện chính (Main Success Scenario)

* **Bước 1: Khởi tạo:** Khách hàng kiểm tra lại danh sách đồ uống (kèm Size, Topping, số lượng và tổng tiền) trong Giỏ hàng trên ứng dụng Next.js UI và nhấn nút "Tiến hành đặt đơn" (Checkout).
* **Bước 2: Xác thực Client:** Hệ thống Next.js UI xác nhận người dùng đã đăng nhập (có sẵn JWT Token) và điều hướng người dùng sang màn hình Xác nhận đơn hàng & Thanh toán.
* **Bước 3: Chọn thanh toán:** Khách hàng kiểm tra tóm tắt đơn hàng, lựa chọn phương thức thanh toán mô phỏng (Ví điện tử hoặc Thẻ ngân hàng) và nhấn nút "Thanh toán ngay".
* **Bước 4: Gửi request tạo đơn:** Next.js UI đính kèm Token xác thực trên Header `Authorization` và gửi request `POST /orders` chứa danh sách các món trong giỏ hàng đến NestJS API.
* **Bước 5: Validate Backend:** NestJS API xác thực tính hợp lệ của JWT Token và kiểm tra tính hợp lệ của dữ liệu đầu vào (mã sản phẩm, Size, Topping, số lượng $> 0$).
* **Bước 6: Transaction tạo đơn & trừ tồn kho:** NestJS API mở một Database Transaction tới PostgreSQL để thực hiện:
  * Kiểm tra số lượng tồn kho của từng Product trong đơn (áp dụng optimistic locking).
  * Tính toán lại tổng tiền chính xác tại tầng Backend (bao gồm giá gốc, phụ thu Size, Topping và giảm giá Khuyến mãi nếu có).
  * Khởi tạo bản ghi Order (trạng thái `PENDING`) và các bản ghi chi tiết `OrderItem`.
  * Khấu trừ số lượng tồn kho tương ứng của sản phẩm và Commit Transaction.
* **Bước 7: Yêu cầu thanh toán:** Next.js UI tạo một mã duy nhất `Idempotency-Key` và gửi request `POST /payments` cho đơn hàng vừa tạo đến NestJS API.
* **Bước 8: Khởi tạo Payment & gọi dịch vụ bên ngoài:** NestJS API kiểm tra `Idempotency-Key` chưa từng được xử lý, tạo bản ghi Payment (trạng thái `PENDING`) vào Database, sau đó gửi lệnh thu tiền tới Payment Service mô phỏng.
* **Bước 9: Xử lý giao dịch thanh toán:** Payment Service xử lý giao dịch thành công và trả về mã tham chiếu giao dịch (`transactionRef`) cùng trạng thái `SUCCESS` cho NestJS API.
* **Bước 10: Cập nhật đơn hàng & Tích điểm:** NestJS API mở Transaction cập nhật Database:
  * Chuyển trạng thái Payment sang `SUCCESS`.
  * Chuyển trạng thái Order từ `PENDING` sang `PAID`.
  * Ghi nhận cộng điểm thưởng cho khách hàng vào bảng `LoyaltyTransaction`.
  * Trả phản hồi thành công ($200\text{ OK}$) về cho Next.js UI.
* **Bước 11: Hoàn tất & Chuyển màn hình:** Next.js UI tự động làm trống Giỏ hàng, hiển thị mã đơn và màn hình xác nhận đặt hàng thành công, đồng thời cung cấp tùy chọn chuyển sang màn hình Theo dõi trạng thái đơn hàng (Order Tracking).

---

## 5. Đặc tả các Luồng thay thế (Alternative Flows)

### 1: Áp dụng mã Voucher/Khuyến mãi (Khớp nhánh `<<extend>>` Áp dụng voucher)
* **Điểm rẽ nhánh:** Tại Bước 3 của Luồng chính, trước khi nhấn "Thanh toán ngay", khách hàng nhập mã Voucher hoặc chọn Voucher có sẵn trong ví ưu đãi.
* **Hệ thống xử lý:**
  1. Next.js UI gửi mã voucher lên API kiểm tra hợp lệ (`POST /promotions/validate`).
  2. NestJS API kiểm tra hạn dùng, điều kiện tổng đơn tối thiểu và số lượt dùng còn lại của Voucher.
  3. Hệ thống trả về số tiền chiết khấu hợp lệ; Next.js UI tính toán trừ trực tiếp vào tổng tiền hiển thị cho khách hàng xem trước.
* **Quay lại luồng chính:** Tiếp tục thực hiện Bước 4; tại Bước 6, NestJS API ghi nhận mã khuyến mãi, trừ số tiền giảm giá và đánh dấu $1$ lượt sử dụng voucher khi commit đơn hàng.

### 2: Client gửi lặp yêu cầu thanh toán do mạng lag (Cơ chế Idempotency)
* **Điểm rẽ nhánh:** Tại Bước 7 hoặc Bước 8, do độ trễ đường truyền hoặc khách hàng bấm nút thanh toán nhiều lần liên tiếp, Next.js UI gửi lại request `POST /payments` mang cùng một giá trị `Idempotency-Key`.
* **Hệ thống xử lý:**
  1. NestJS API phát hiện khóa `Idempotency-Key` này đã tồn tại trong CSDL hoặc Cache và đang/đã được xử lý.
  2. Hệ thống **không** khởi tạo giao dịch mới sang Payment Service.
  3. Nếu giao dịch trước đó đã thành công, NestJS API trả về ngay lập tức dữ liệu kết quả cũ kèm mã HTTP $200\text{ OK}$.
* **Quay lại luồng chính:** Next.js UI nhận phản hồi thành công và chuyển thẳng sang Bước 11.

### 3: Thay đổi phương thức thanh toán sau khi chọn
* **Điểm rẽ nhánh:** Tại Bước 3, khách hàng đã chọn Ví điện tử nhưng đổi ý muốn chuyển sang Thẻ ngân hàng nội địa/quốc tế mô phỏng.
* **Hệ thống xử lý:** Next.js UI cập nhật lại trạng thái phương thức thanh toán trên giao diện mà không gửi request lên máy chủ.
* **Quay lại luồng chính:** Khách hàng nhấn "Thanh toán ngay" và tiếp tục từ Bước 4.

---

## 6. Đặc tả các Luồng ngoại lệ (Exception Flows)

### 1: Phiên đăng nhập hết hạn hoặc JWT không hợp lệ
* **Điểm phát sinh:** Tại Bước 2 (Client phát hiện mất token) hoặc Bước 5 (Backend xác thực JWT thất bại).
* **Hệ thống xử lý:**
  1. NestJS API từ chối request với mã lỗi HTTP $401\text{ Unauthorized}$.
  2. Next.js UI lưu tạm trạng thái giỏ hàng vào `localStorage`, hiển thị thông báo: *"Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục"*.
  3. Điều hướng người dùng sang màn hình Đăng nhập. Sau khi đăng nhập thành công, điều hướng ngược lại giỏ hàng.
* **Kết thúc:** Luồng use-case dừng lại an toàn; không có đơn hàng nào được tạo.

### 2: Sản phẩm hết hàng hoặc tồn kho không đủ (Out of Stock / Race Condition)
* **Điểm phát sinh:** Tại Bước 6, khi NestJS API kiểm tra tồn kho trong PostgreSQL.
* **Hệ thống xử lý:**
  1. PostgreSQL phát hiện số lượng tồn kho của một hoặc nhiều sản phẩm/topping nhỏ hơn số lượng yêu cầu.
  2. NestJS API kích hoạt lệnh `ROLLBACK TRANSACTION`, hủy toàn bộ thao tác tạo đơn hàng.
  3. Backend trả về mã lỗi HTTP $409\text{ Conflict}$ kèm danh sách ID các sản phẩm bị hết hàng.
  4. Next.js UI giữ nguyên các món còn lại trong giỏ hàng, đánh dấu đỏ các món hết hàng và hiển thị thông báo: *"Một số sản phẩm trong giỏ đã hết hàng hoặc không đủ số lượng. Vui lòng cập nhật lại giỏ hàng"*.
* **Kết thúc:** Luồng use-case kết thúc, khách hàng ở lại màn hình giỏ hàng để chỉnh sửa món.

### EF-03: Giao dịch thanh toán bị từ chối hoặc thất bại (Khớp nhánh `<<extend>>` Xử lý thanh toán lỗi)
* **Điểm phát sinh:** Tại Bước 9, Payment Service từ chối thanh toán (ví dụ: tài khoản mô phỏng không đủ số dư, thông tin thẻ không hợp lệ).
* **Hệ thống xử lý:**
  1. Payment Service trả về trạng thái `FAILED` kèm mã lý do lỗi cho NestJS API.
  2. NestJS API mở Transaction cập nhật:
     * Cập nhật bản ghi Payment sang trạng thái `FAILED`.
     * Cập nhật bản ghi Order sang trạng thái `PAYMENT_FAILED`.
     * Hoàn trả số lượng tồn kho nguyên liệu/sản phẩm đã khấu trừ tạm thời ở Bước 6.
     * Hủy áp dụng Voucher (nếu có).
  3. NestJS API trả về mã lỗi HTTP $400\text{ Bad Request}$ hoặc $402\text{ Payment Required}$.
  4. Next.js UI giữ nguyên giỏ hàng của khách hàng, hiển thị pop-up cảnh báo: *"Thanh toán không thành công: Tài khoản không đủ số dư hoặc giao dịch bị từ chối. Vui lòng thử lại"*.
* **Kết thúc:** Cho phép khách hàng nhấn chọn lại phương thức thanh toán khác hoặc quay lại giỏ hàng.

### 4: Cổng thanh toán bị gián đoạn hoặc hết thời gian chờ (Gateway Timeout)
* **Điểm phát sinh:** Tại Bước 8 - Bước 9, NestJS API không nhận được phản hồi từ Payment Service sau $10\text{ giây}$ (Timeout).
* **Hệ thống xử lý:**
  1. NestJS API tự động ngắt kết nối và gửi lệnh đối soát/hủy giao dịch sang Payment Service (nếu có hỗ trợ).
  2. Backend thực hiện Rollback hoàn trả tồn kho và đổi trạng thái đơn sang `PAYMENT_FAILED`.
  3. Backend trả về mã lỗi HTTP $504\text{ Gateway Timeout}$.
  4. Next.js UI hiển thị thông báo: *"Dịch vụ thanh toán tạm thời không phản hồi. Tài khoản của bạn chưa bị trừ tiền. Vui lòng thử lại sau ít phút"*.
* **Kết thúc:** Dừng luồng giao dịch an toàn.

---

## 7. Liên kết Mã yêu cầu (FR/NFR) & Tiêu chí nghiệm thu phục vụ viết Test

| Bước Use-case | Mã FR / NFR liên quan | Kịch bản kiểm thử (Test Scenario) | Tiêu chí nghiệm thu (Acceptance Criteria phục vụ viết Test) |
| :--- | :--- | :--- | :--- |
| **Bước 1, 2** | - **FR-03** (Giỏ hàng)<br>- **FR-04** (Xác thực) | Kiểm tra điều kiện tiên quyết khi nhấn Checkout. | - Giỏ hàng rỗng (`items: []`): Nút Checkout bị vô hiệu hóa (disabled).<br>- Chưa có JWT Token: Client tự động chuyển hướng về `/login`. |
| **Bước 5** | - **FR-05** (Đặt đơn)<br>- **NFR-02** (Bảo mật) | Validate payload của request `POST /orders`. | - Trả về HTTP $400\text{ Bad Request}$ nếu $\text{quantity} < 1$ hoặc trùng topping trong $1$ món.<br>- Trả về HTTP $401\text{ Unauthorized}$ nếu JWT header bị thiếu/giả mạo. |
| **Bước 6** | - **FR-05** (Đặt đơn & Tồn kho)<br>- **NFR-01** (Hiệu năng) | Tạo đơn hàng trong DB Transaction khi kho đủ vs. kho hết (Concurrency Test). | - **Đủ tồn kho:** Tạo Order có status = `PENDING`, trừ tồn kho chính xác, phản hồi trong $< 1000\text{ms}$.<br>- **Hết tồn kho (EF-02):** Rollback $100\%$, trả về HTTP $409\text{ Conflict}$, tồn kho trong DB không đổi. |
| **Bước 7, 8** | - **FR-06** (Thanh toán & Idempotency) | Gửi đồng thời $2$ request thanh toán cùng `Idempotency-Key` (Unit/Integration Test). | - **Request đầu tiên:** Tạo bản ghi Payment `PENDING` và gọi Payment Service.<br>- **Request thứ hai:** Nhận lại kết quả cũ, DB chỉ tồn tại duy nhất $01$ giao dịch thanh toán thành công, không bị trừ tiền $2$ lần. |
| **Bước 9, 10** | - **FR-06** (Thanh toán)<br>- **FR-08** (Quản lý trạng thái) | Xử lý kết quả trả về từ Payment Service (Mock Gateway). | - **Thanh toán SUCCESS:** Order chuyển sang `PAID`, Payment chuyển sang `SUCCESS`, cộng điểm vào `LoyaltyTransaction`.<br>- **Thanh toán FAILED (EF-03):** Order chuyển sang `PAYMENT_FAILED`, hoàn trả tồn kho sản phẩm nguyên trạng. |
| **Bước 11** | - **FR-07** (Xác nhận đơn)<br>- **NFR-03** (Tính khả dụng PWA) | Làm trống giỏ hàng và chuyển hướng trên giao diện Next.js (E2E Test). | - `localStorage` giỏ hàng bị xóa rỗng hoàn toàn.<br>- URL chuyển hướng sang `/orders/tracking/[orderId]` hiển thị đúng mã nhận nước và mã QR nhận món. |