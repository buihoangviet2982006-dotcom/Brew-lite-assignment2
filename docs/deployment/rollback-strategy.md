# Thiết lập Dừng Pipeline khi lỗi (Fail-Fast) & Kịch bản Rollback (Task 5.3)

**Người phụ trách:** Trần Minh Trí (Thành viên 6)

## 1. Cơ chế Dừng Pipeline tức thời khi phát hiện lỗi (Fail-Fast Gate)

Hệ thống CI/CD của **BrewLite** được cấu hình theo nguyên tắc **Zero-Defect Deployment** nhằm ngăn chặn triệt để mã nguồn lỗi đi vào môi trường vận hành:

- **Cấu hình `strategy.fail-fast: true` và `continue-on-error: false`**: Được áp dụng tại tất cả các bước kiểm tra chất lượng cốt lõi (`npm ci`, `npm run lint`, `npm test`, `npm run build`).
- **Chặn phát hành tự động (`needs: [quality-gate-fail-fast]`)**: Nếu bất kỳ bước kiểm tra Lint, Unit Test hoặc Build nào trả về mã thoát khác `0` (`exit code != 0`), toàn bộ tiến trình phía sau sẽ bị hủy ngay lập tức. Bước Deploy tuyệt đối không được kích hoạt khi bước trước đó thất bại.
- **Chống xung đột tiến trình (`concurrency.cancel-in-progress: true`)**: Tự động hủy các lượt chạy pipeline cũ đang chờ nếu có bản vá mới hơn được đẩy lên cùng một nhánh.

---

## 2. Kịch bản Khôi phục Tự động & Thủ công (Rollback Strategy)

### 2.1. Kịch bản Rollback Tự động (Automated Rollback)

Khi bước kiểm tra chất lượng (`quality-gate-fail-fast`) hoặc bước xác minh sau triển khai (`deploy-verification` / Healthcheck) gặp sự cố:

1. Job `automated-rollback` trong tệp `.github/workflows/cd-rollback-guard.yml` tự động được kích hoạt thông qua điều kiện kiểm tra lỗi.
2. Hệ thống tự động thực thi kịch bản `scripts/rollback-deploy.sh` theo quy trình 4 bước:
   - **Bước 1 (Xác định bản ổn định):** Truy xuất mã commit ổn định gần nhất trước khi xảy ra lỗi (`HEAD~1` hoặc `LAST_STABLE_SHA`).
   - **Bước 2 (Kích hoạt khôi phục):** Gửi tín hiệu POST tới `ROLLBACK_WEBHOOK_URL` để hạ tầng Cloud khôi phục lại bản dựng ổn định trước đó.
   - **Bước 3 (Kiểm tra sức khỏe dịch vụ):** Gọi kiểm tra tự động tới `DEPLOY_HEALTHCHECK_URL` để xác nhận dịch vụ phản hồi mã trạng thái HTTP `200 OK`.
   - **Bước 4 (Lưu vết kiểm toán QA):** Xuất tệp biên bản sự cố dạng JSON vào thư mục `rollback-logs/` và tải lên GitHub Actions Artifacts để đội ngũ QA/Dev truy vết nguyên nhân.

### 2.2. Kịch bản Rollback Khẩn cấp bằng tay (Manual Rollback)

Trong trường hợp phát hiện lỗi nghiệp vụ phát sinh sau khi đã phát hành:

- **Cách 1 (Kích hoạt trên giao diện GitHub Actions):**
  1. Truy cập tab **Actions** trên kho lưu trữ GitHub của dự án.
  2. Chọn workflow **CD Pipeline Guard & Automated Rollback**.
  3. Nhấn nút **Run workflow**, chọn môi trường (`staging` hoặc `production`) và nhập mã commit (`SHA`) ổn định cần khôi phục.

- **Cách 2 (Thực thi trực tiếp qua dòng lệnh CLI):**
  Chạy lệnh sau tại thư mục gốc của dự án (thay `FAILED_COMMIT_SHA` và `STABLE_COMMIT_SHA` bằng mã commit thực tế):
  `bash scripts/rollback-deploy.sh production FAILED_COMMIT_SHA STABLE_COMMIT_SHA`

---

## 3. Bảng Ma trận Xử lý Sự cố Pipeline

| Giai đoạn | Tín hiệu lỗi phát hiện | Hành động của Pipeline | Cơ chế Rollback / Phục hồi |
| :--- | :--- | :--- | :--- |
| **1. Install & Lint** | Lỗi cú pháp, sai quy tắc ESLint / TypeScript | Dừng pipeline ngay lập tức (`exit code 1`), khóa bước Build & Deploy | Giữ nguyên phiên bản hiện hành trên môi trường chạy thật |
| **2. Unit / E2E Test** | Sai lệch logic tính giá hoặc lỗi luồng giao diện | Hủy tiến trình phát hành, xuất báo cáo lỗi | Chặn PR hợp nhất vào nhánh đích |
| **3. Build Application** | Lỗi biên dịch Next.js hoặc NestJS | Dừng pipeline tại bước Build | Giữ nguyên container/deployment ổn định trước đó |
| **4. Post-Deploy Smoke Check** | API Healthcheck trả về mã lỗi `5xx` hoặc quá thời gian chờ | Đánh dấu lượt Deploy thất bại | Tự động chạy `scripts/rollback-deploy.sh` quay về `HEAD~1` |