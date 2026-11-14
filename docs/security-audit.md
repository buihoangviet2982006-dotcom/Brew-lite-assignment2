# Báo Cáo Rà Soát Bảo Mật Repository & CI/CD Logs (Task 5.4)

- **Phiên bản kiểm tra:** `v1.0.0`
- **Người thực hiện:** Nguyễn Quang Đạt (Task 5.4 - STT 2)
- **Mã yêu cầu đối chiếu:** `NFR-02` (Bảo mật xác thực, cấu hình và nhật ký CI/CD)

## 1. Phạm vi và kết quả rà soát

| Hạng mục kiểm tra | Công cụ / Phương pháp | Kết quả | Ghi chú đối chứng |
| :--- | :--- | :--- | :--- |
| **Tệp biến môi trường (`.env*`)** | `git ls-files` & `.gitignore` | **ĐẠT (PASS)** | Chỉ lưu `.env.example` làm mẫu; toàn bộ `.env`, `.env.local`, `.env.production.local` đã bị chặn bởi `.gitignore`. |
| **Ngữ cảnh đóng gói Docker** | `.dockerignore` & Multi-stage build | **ĐẠT (PASS)** | `.dockerignore` loại trừ `.env*` và `.git`; container chạy dưới quyền non-root (`nestjs` / `nextjs`). |
| **Lịch sử Commit & Mã nguồn** | `git grep` quét mẫu khóa bí mật | **ĐẠT (PASS)** | Không tồn tại API Token thực tế, khóa cá nhân (`.pem`, `.key`), mật khẩu Production hay JWT secret cứng trong code. |
| **Nhật ký GitHub Actions (CI/CD Logs)** | Rà soát `.github/workflows/*.yml` | **ĐẠT (PASS)** | Không có lệnh `echo` in biến `${{ secrets.* }}`; GitHub Actions tự động che (mask `***`) toàn bộ biến Secret. |
| **Phản hồi lỗi API & Health Check** | Kiểm tra `ValidationPipe` & `GET /health` | **ĐẠT (PASS)** | `ValidationPipe` bật `whitelist: true`, `forbidNonWhitelisted: true`; `GET /health` ẩn chi tiết chuỗi kết nối PostgreSQL khi lỗi. |

## 2. Quy tắc quản lý Secret trên môi trường Production
1. Mọi thông tin nhạy cảm (`DATABASE_URL`, `JWT_SECRET`, `SEPAY_API_TOKEN`, `SEPAY_WEBHOOK_SECRET`, thông tin đăng nhập Container Registry/SSH) bắt buộc khai báo trong **GitHub Repository Secrets** (`Settings -> Secrets and variables -> Actions`).
2. Các biến công khai phía trình duyệt (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`) được tách bạch qua **GitHub Actions Variables** (`vars.*`), không chứa khóa bí mật phía máy chủ.