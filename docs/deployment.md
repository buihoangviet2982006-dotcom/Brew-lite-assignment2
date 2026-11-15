# Hướng Dẫn Triển Khai & Đóng Gói Container Registry (Task 5.3 & 5.4)

Tài liệu này hướng dẫn chi tiết quy trình đóng gói ứng dụng BrewLite thành Docker Image, gắn thẻ phiên bản (Image Tagging) và đẩy tự động lên Container Registry thông qua pipeline Continuous Delivery (CD).

---

## 1. Tổng Quan Kiến Trúc Đóng Gói (Containerization)

Dự án BrewLite áp dụng kiến trúc Monorepo phân tách thành 2 dịch vụ độc lập:
1. **Backend API (`apps/api`)**:
   - Nền tảng: NestJS (Node.js 20-slim) + Prisma ORM + PostgreSQL.
   - Cổng giao tiếp: `4000`.
   - File cấu hình: [`apps/api/Dockerfile`](../apps/api/Dockerfile).
   - Tự động sinh Prisma client và chạy migration an toàn khi khởi chạy.

2. **Frontend Web (`apps/web`)**:
   - Nền tảng: Next.js 14 (App Router) + Zustand Client Store.
   - Cổng giao tiếp: `3000`.
   - File cấu hình: [`apps/web/Dockerfile`](../apps/web/Dockerfile).
   - Tối ưu hóa biến môi trường build (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`).

File [`.dockerignore`](../.dockerignore) ở thư mục gốc giúp loại bỏ `node_modules`, `.next`, `dist`, file `.env` và các artifact kiểm thử, đảm bảo build context nhẹ và an toàn bảo mật.

---

## 2. Chiến Lược Gắn Tag Phiên Bản (Image Tagging Strategy)

Theo yêu cầu chuẩn **Task 5.3 (DoD & Backlog BL-18)**, mỗi Docker Image khi build đều được gắn đa thẻ (multi-tagging) để đảm bảo tính bất biến (immutability), khả năng truy vết và hỗ trợ rollback:

| Loại Tag | Định dạng ví dụ | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- |
| **Commit SHA (Short)** | `sha-6cf95e7` | Gắn liền với từng commit cụ thể; phục vụ kiểm thử, truy vết và rollback tức thì khi cần. |
| **Branch Ref** | `develop`, `main` | Định danh phiên bản mới nhất trên nhánh tương ứng. |
| **SemVer (Semantic)** | `v1.0.0`, `1.0.0`, `1.0` | Tạo tự động khi đánh git tag release (`git tag v1.0.0`). |
| **Latest** | `latest` | Chỉ trỏ vào bản build thành công mới nhất trên nhánh chính `main`. |

---

## 3. Container Registry Được Hỗ Trợ

Pipeline CD tại [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) hỗ trợ 2 hệ thống Registry:

### 3.1. GitHub Container Registry (GHCR - Mặc định)
- **Địa chỉ Registry**: `ghcr.io`
- **Tên Image**:
  - `ghcr.io/<owner>/brewlite-api:<tag>`
  - `ghcr.io/<owner>/brewlite-web:<tag>`
- **Xác thực**: Sử dụng tự động biến môi trường tích hợp sẵn `${{ secrets.GITHUB_TOKEN }}` với quyền `packages: write`. Hoạt động ngay lập tức mà không cần tạo token thủ công.

### 3.2. Docker Hub (Tùy chọn bổ sung)
- **Địa chỉ Registry**: `docker.io`
- **Tên Image**:
  - `<dockerhub_username>/brewlite-api:<tag>`
  - `<dockerhub_username>/brewlite-web:<tag>`
- **Xác thực**: Tự động kích hoạt khi cấu hình 2 secrets trên GitHub Repository:
  - `DOCKERHUB_USERNAME`: Tên tài khoản Docker Hub.
  - `DOCKERHUB_TOKEN`: Personal Access Token sinh từ Docker Hub Security Settings.

---

## 4. Quy Trình Kích Hoạt Pipeline CD

Pipeline [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) được kích hoạt tự động theo các sự kiện:
1. **Push lên các nhánh**: `main`, `develop`, `ci/*`.
2. **Push Git Tag phiên bản**: `v*` (ví dụ `git push origin v1.0.0`).
3. **Pull Request**: Khi có PR vào `main`/`develop`, pipeline chạy chế độ kiểm tra build image (không push registry) để đảm bảo chất lượng.
4. **Thủ công (Workflow Dispatch)**: Có thể kích hoạt bất kỳ lúc nào tại tab **Actions** trên GitHub kèm tùy chọn bật/tắt push registry.

---

## 5. Hướng Dẫn Kéo & Chạy Image Trực Tiếp (Pull & Run)

### 5.1. Kéo image từ GitHub Container Registry (GHCR)
```bash
# Đăng nhập vào GHCR (sử dụng GitHub Personal Access Token có quyền read:packages)
echo $CR_PAT | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin

# Kéo Backend API Image
docker pull ghcr.io/buihoangviet2982006-dotcom/brewlite-api:latest

# Kéo Frontend Web Image
docker pull ghcr.io/buihoangviet2982006-dotcom/brewlite-web:latest
```

### 5.2. Chạy thử nghiệm bằng Docker Run
```bash
# Chạy Backend API (yêu cầu DATABASE_URL)
docker run -d \
  --name brewlite-api \
  -p 4000:4000 \
  -e DATABASE_URL="postgresql://brewlite:brewlite_secret@host.docker.internal:5432/brewlite2_db?schema=public" \
  -e JWT_SECRET="your-super-secret-jwt-key" \
  ghcr.io/buihoangviet2982006-dotcom/brewlite-api:latest

# Chạy Frontend Web
docker run -d \
  --name brewlite-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:4000" \
  ghcr.io/buihoangviet2982006-dotcom/brewlite-web:latest
```
