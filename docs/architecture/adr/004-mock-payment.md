# Thiết kế Kiến trúc Dịch vụ Thanh toán Mô phỏng (Mock Payment Service)

## 1. Bối cảnh và Mục tiêu
Trong giai đoạn MVP, hệ thống BrewLite cần kiểm chứng toàn vẹn quy trình thanh toán (tạo đơn, trừ tiền, cập nhật trạng thái, hoàn tồn kho khi lỗi) và tính năng chống thanh toán trùng (Idempotency). Thay vì tích hợp cổng thanh toán thực tế (VNPAY/MoMo/Stripe) đòi hỏi môi trường sandbox phức tạp, hệ thống sẽ sử dụng một **Dịch vụ Thanh toán Mô phỏng (Mock Payment Service)** hoạt động như một hệ thống độc lập bên thứ ba.

## 2. Cấu trúc Thành phần (Components)
Dịch vụ mô phỏng được thiết kế thành một Module riêng biệt trong NestJS (`MockPaymentModule`) bao gồm:

*   **`MockPaymentController`**: Cung cấp endpoint `POST /api/payments/mock-charge` đóng vai trò là Webhook/API Gateway tiếp nhận yêu cầu từ hệ thống Order.
*   **`MockPaymentService`**: Xử lý logic giả lập thời gian phản hồi (latency) và sinh mã giao dịch (`transactionRef`).
*   **`IdempotencyCache`**: Sử dụng In-memory Map (hoặc Redis) lưu trữ các `Idempotency-Key` trong 24 giờ để đảm bảo nguyên tắc xử lý duy nhất, không trừ tiền lặp.

## 3. Cơ chế chống thanh toán trùng (Idempotency Flow)
Để đảm bảo an toàn giao dịch, dịch vụ áp dụng quy trình kiểm tra nghiêm ngặt:

1.  **Bước 1**: Client (Next.js) gửi request thanh toán lên Order API, Order API gọi sang Mock Payment Service kèm `Idempotency-Key` (UUID) trên HTTP Header.
2.  **Bước 2**: `MockPaymentController` tiếp nhận và tra cứu `Idempotency-Key` trong `IdempotencyCache`.
3.  **Bước 3 (Phân nhánh xử lý)**: 
    *   **Nếu Key đã tồn tại**: Hệ thống bỏ qua bước trừ tiền, lập tức trả về kết quả JSON của lần giao dịch thành công trước đó (kèm mã `HTTP 200 OK`).
    *   **Nếu Key chưa tồn tại**: Chuyển xuống Service xử lý giao dịch, tạo mã tham chiếu mới, lưu kết quả vào Cache và phản hồi cho Backend.

## 4. Kịch bản Mô phỏng (Deterministic Simulation)
Dịch vụ cung cấp các kịch bản kiểm thử cố định dựa vào dữ liệu đầu vào (payload) để hệ thống Order xử lý các luồng ngoại lệ:

| Tham số đầu vào (Payload) | Hành vi giả lập của Mock Service | Kết quả trả về (Response) |
| :--- | :--- | :--- |
| Chọn thanh toán "Ví điện tử" hoặc "Thẻ" bình thường | Xử lý thành công sau độ trễ giả lập $300\text{ms}$. | `HTTP 200 OK`<br>`status: "SUCCESS"`<br>`transactionRef: "TXN_..."` |
| Chọn phương thức có mã `"MOCK_FAIL"` | Giả lập tài khoản ví/thẻ không đủ số dư. | `HTTP 400 Bad Request`<br>`status: "FAILED"`<br>`reason: "Tài khoản không đủ số dư"` |
| Đơn hàng có tổng tiền số lẻ kết thúc bằng `"99"` | Giả lập hệ thống ngân hàng bị treo hoặc mất kết nối (Sleep thread 10s). | `HTTP 504 Gateway Timeout`<br>*(Kích hoạt luồng Rollback của hệ thống)* |

## 5. Quy trình Giao tiếp (Communication Flow)
1.  Khách hàng bấm "Thanh toán", Next.js gửi request tạo đơn lên NestJS Order API kèm `Idempotency-Key`.
2.  NestJS Order API tạm giữ tồn kho, tạo Order trạng thái `PENDING`, sau đó đóng vai trò là HTTP Client gọi sang `POST /api/payments/mock-charge`.
3.  Mock Payment Service phân tích payload, áp dụng Rule mô phỏng ở Mục 4 và trả về kết quả.
4.  NestJS Order API nhận kết quả:
    *   Nếu `SUCCESS`: Đổi trạng thái Order thành `PAID`, commit trừ kho thực tế.
    *   Nếu `FAILED` / Timeout: Đổi trạng thái Order thành `PAYMENT_FAILED`, rollback hoàn trả tồn kho.