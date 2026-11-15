# Báo Cáo Rà Soát Bảo Mật Repository & CI/CD Logs (Task 5.4)

- **Phiên bản kiểm tra:** `v1.0.0`
- **Mã yêu cầu đối chiếu:** `NFR-02` (Bảo mật xác thực, cấu hình và nhật ký CI/CD)

## 1. Phạm vi và kết quả rà soát

| Hạng mục kiểm tra | Công cụ / Phương pháp | Kết quả | Ghi chú đối chứng |
| :--- | :--- | :---: | :--- |
| **Tệp biến môi trường (`.env*`)** | `git ls-files` & `.gitignore` | **ĐẠT (PASS)** | Chỉ lưu `.env.example`, `apps/api/.env.example`, `apps/web/.env.example` làm mẫu; toàn bộ `.env`, `.env.local`, `.env.production.local` bị chặn bởi `.gitignore`. |
| **Ngữ cảnh đóng gói Docker** | `.dockerignore` & Multi-stage build | **ĐẠT (PASS)** | `.dockerignore` loại trừ `.env*`, `.git`, `tests`, `docs`; cả 2 container `api` và `web` đều chạy dưới quyền non-root (`nestjs` / `nextjs`). |
| **Lịch sử Commit & Mã nguồn** | Rà soát mã nguồn & lịch sử Git | **ĐẠT (PASS)** | Không tồn tại API Token thực tế, khóa cá nhân (`.pem`, `.key`), mật khẩu Production hay JWT secret thật cứng trong mã nguồn. |
| **Nhật ký GitHub Actions (CI/CD Logs)** | Rà soát `.github/workflows/*.yml` | **ĐẠT (PASS)** | Không có lệnh `echo` in giá trị `${{ secrets.* }}`; tất cả secret Production (`RENDER_DATABASE_URL`, `RENDER_DEPLOY_HOOK`, `VERCEL_DEPLOY_HOOK`, `ROLLBACK_WEBHOOK_URL`) được truyền qua GitHub Environment `production` và tự động mask (`***`). |
| **Phản hồi lỗi API & Health Check** | Kiểm tra `ValidationPipe` & `GET /health` | **ĐẠT (PASS)** | `ValidationPipe` bật `whitelist: true`, `forbidNonWhitelisted: true`; `GET /health` chỉ trả trạng thái dịch vụ, không lộ chuỗi kết nối PostgreSQL hay stack trace. |

## 2. Phân tách Secrets và Variables trên môi trường Production

1. **GitHub Environment Secrets (`production`):**
   - `RENDER_DATABASE_URL`: External Database URL dùng riêng cho bước `prisma migrate deploy` trong CD pipeline.
   - `RENDER_DEPLOY_HOOK`: URL kích hoạt triển khai Backend API trên Render.
   - `VERCEL_DEPLOY_HOOK`: URL kích hoạt triển khai Frontend Web trên Vercel.
   - `ROLLBACK_WEBHOOK_URL` *(tùy chọn)*: Webhook kích hoạt rollback tự động khi deploy/smoke test thất bại.
2. **GitHub Environment Variables (`production`):**
   - `API_PRODUCTION_URL`: URL gốc API trên Render phục vụ Smoke Test `/health`.
   - `WEB_PRODUCTION_URL`: URL gốc Web trên Vercel phục vụ Smoke Test `/menu`.
   - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`: Biến công khai phía trình duyệt.
3. **Database Production Private Access:**
   - Trên Render, Web Service API kết nối PostgreSQL bằng **Internal Database URL**, không dùng mật khẩu DB làm `JWT_SECRET` hay `SEPAY_WEBHOOK_SECRET`.
