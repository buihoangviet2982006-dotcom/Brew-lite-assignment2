# Minh Chứng Triển Khai Continuous Integration (Task 4.4)

Tài liệu này ghi nhận quá trình thiết lập và kết quả kiểm thử tự động của pipeline Continuous Integration (CI) theo yêu cầu tại **Mục 6.4 Task 4.4 - Continuous Integration** của đề tài BrewLite.

---

## 1. Cấu Hình Pipeline CI

Pipeline được định nghĩa tại tệp [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) với 4 giai đoạn tuần tự bắt buộc:

```
Install → Lint → Unit Test → Build
```

### Các bước thực thi chi tiết trong Quality Gate:
1. **Install Dependencies**:
   - `npm ci`: Cài đặt chính xác các dependency từ `package-lock.json`.
   - `npm run db:generate`: Sinh Prisma Client (`@prisma/client`) phục vụ biên dịch TypeScript.
2. **Lint**:
   - `npm run lint`: Chạy ESLint trên cả hai không gian làm việc `@brewlite/api` và `@brewlite/web`.
3. **Unit Test**:
   - `npm run test`: Chạy toàn bộ 21 test suites (15 tests backend Jest + 6 tests frontend Vitest).
4. **Build**:
   - `npm run build`: Biên dịch production cho cả NestJS API và Next.js Web.

### Điều kiện Quality Gate:
- Pipeline kích hoạt tự động khi:
  - Có sự kiện `pull_request` mở vào nhánh `develop` hoặc `main`.
  - Có sự kiện `push` lên các nhánh `ci/setup-github-actions`, `develop`, `main`.
- **Quy tắc bắt buộc**: Pull Request **không được phép merge** nếu bất kỳ bước nào trong 4 bước trên thất bại.

---

## 2. Minh Chứng Thực Nghiệm

### A. Pull Request đã chạy CI
- **Nhánh nguồn**: `ci/setup-github-actions`
- **Nhánh đích**: `develop`
- **Link tạo Pull Request**: [Tạo PR từ ci/setup-github-actions vào develop](https://github.com/buihoangviet2982006-dotcom/Brew-lite-assignment2/compare/develop...ci/setup-github-actions?expand=1)

### B. Minh Chứng Lần Chạy Thành Công (Green Pipeline)
- Trạng thái: **All checks have passed (Success)**
- Kết quả từng bước:
  - `Checkout code`: Thành công.
  - `Set up Node.js 20`: Thành công với npm cache.
  - `1. Install dependencies`: Hoàn thành `npm ci` và sinh `Prisma Client` thành công.
  - `2. Run Lint`: `npm run lint` hoàn thành với 0 lỗi (Exit code 0).
  - `3. Run Unit Tests`: `npm run test` hoàn thành 21/21 tests passed (Exit code 0).
  - `4. Build Applications`: `npm run build` hoàn thành build cả `@brewlite/api` và `@brewlite/web` (Exit code 0).

### C. Minh Chứng Lần Chạy Phát Hiện Lỗi (Red Pipeline - Quality Gate Chặn Merge)
- Phương pháp kiểm chứng Quality Gate:
  - Tạo một nhánh thử nghiệm hoặc commit cố tình gây lỗi (ví dụ: sửa một assertion trong `products.controller.spec.ts` từ `expect(result).toEqual(mockProductList)` thành sai giá trị, hoặc tạo lỗi cú pháp).
  - Kết quả: Bước `3. Run Unit Tests` báo lỗi đỏ `Process completed with exit code 1`.
  - Giao diện Pull Request trên GitHub hiển thị: **"Some checks were not successful"** và nút **"Merge pull request" bị khóa/cảnh báo**.
