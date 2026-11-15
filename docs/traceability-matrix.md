# Ma Trận Truy Vết Yêu Cầu (Requirements Traceability Matrix)

Tài liệu này theo dõi mối liên kết hai chiều giữa Yêu cầu nghiệp vụ (SRS), Mô hình hóa thiết kế, Mã nguồn hiện thực và các Kịch bản kiểm thử tương ứng theo mục **8.1 Truy vết bắt buộc** của đề bài Assignment 2.

## Ma Trận Truy Vết Sprint 1 (Task 4.3 MVP)

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Mã Test | Tệp kiểm thử & Phạm vi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-01** | **US-01: Xem menu**<br>- Hiển thị danh sách đồ uống dạng lưới<br>- Các trạng thái: loading, empty, error, success<br>- Lọc theo danh mục và tìm kiếm | `Activity-01` (Activity diagram luồng duyệt menu & checkout)<br>`Class-01` (Product, RecipeItem, Ingredient) | `GET /products`<br>`apps/api/src/modules/products/products.controller.ts`<br>`apps/api/src/modules/products/products.service.ts`<br>`apps/web/src/app/menu/page.tsx`<br>`apps/web/src/components/menu/ProductCard.tsx`<br>`apps/web/src/components/ui/MenuSkeleton.tsx`<br>`apps/web/src/components/ui/EmptySate.tsx`<br>`apps/web/src/components/ui/ErrorAlert.tsx` | **API-T01**<br><br>**API-T02**<br><br>**API-INT-01**<br><br>**WEB-T01**<br><br>**WEB-T02**<br><br>**WEB-T03**<br><br>**WEB-T04**<br><br>**WEB-T05** | `apps/api/src/modules/products/products.controller.spec.ts`<br>*(Unit test Controller GET /products)*<br><br>`apps/api/src/modules/products/products.service.spec.ts`<br>*(Unit test Service tính tồn kho, giá số, danh sách rỗng)*<br><br>`apps/api/src/modules/products/products.integration.spec.ts`<br>*(Integration test Controller + Service với mock DB)*<br><br>`apps/web/src/components/Menu.spec.tsx` *(Test case 1)*<br>*(Kiểm thử trạng thái Loading - MenuSkeleton)*<br><br>`apps/web/src/components/Menu.spec.tsx` *(Test case 2)*<br>*(Kiểm thử trạng thái Empty - EmptyState)*<br><br>`apps/web/src/components/Menu.spec.tsx` *(Test case 3)*<br>*(Kiểm thử trạng thái Error & Thử lại - ErrorAlert)*<br><br>`apps/web/src/components/Menu.spec.tsx` *(Test case 4)*<br>*(Kiểm thử luồng chính hiển thị danh sách tên, giá)*<br><br>`apps/web/src/components/Menu.spec.tsx` *(Test cases 5 & 6)*<br>*(Kiểm thử tìm kiếm đồ uống & lọc theo danh mục)* |
| **FR-02** | **UC-01: Chi tiết sản phẩm**<br>- Xem thông tin chi tiết một món theo ID<br>- Báo lỗi 404 khi không tìm thấy | `Class-01` (Product, RecipeItem, Ingredient) | `GET /products/:id`<br>`apps/api/src/modules/products/products.controller.ts`<br>`apps/api/src/modules/products/products.service.ts` | **API-T03**<br><br>**API-T04**<br><br>**API-INT-02** | `apps/api/src/modules/products/products.controller.spec.ts`<br>*(Unit test Controller GET /products/:id)*<br><br>`apps/api/src/modules/products/products.service.spec.ts`<br>*(Unit test Service lấy chi tiết sản phẩm và ném NotFoundException)*<br><br>`apps/api/src/modules/products/products.integration.spec.ts`<br>*(Integration test Controller + Service trả về chi tiết hoặc ném lỗi 404)* |

---

## Tóm Tắt Tình Trạng Kiểm Thử (Sprint 1 Verification)

- **Backend API (@brewlite/api)**:
  - 3 test suites: `products.controller.spec.ts`, `products.service.spec.ts`, `products.integration.spec.ts`.
  - 15 test cases độc lập, 100% Mock Prisma (không yêu cầu kết nối cơ sở dữ liệu vật lý).
  - Kết quả: **15/15 PASSED**.
- **Frontend Next.js (@brewlite/web)**:
  - 1 test suite: `Menu.spec.tsx`.
  - 6 test cases (đầy đủ các trạng thái Loading, Empty, Error + Retry, Success, Search, Category filter).
  - Mock API 100% trên môi trường DOM Vitest + jsdom (không yêu cầu backend server sống).
  - Kết quả: **6/6 PASSED**.
- **Chạy tổng hợp Monorepo (`npm run test`)**: **21/21 PASSED** (0 failures).

---

## Ma Trận Truy Vết Sprint 2 (Task 5.3: Container Registry & Continuous Delivery)

| Mã yêu cầu | Hạng mục / Nhiệm vụ | Thiết kế / Sơ đồ | Mã nguồn / Pipeline | Quy tắc kiểm chứng | Phạm vi / Minh chứng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NFR-04** | **Đóng gói Docker & Push Registry (Task 5.3)**<br>- Đóng gói Container `apps/api` và `apps/web`<br>- Gắn thẻ đa phiên bản (SHA, SemVer, branch ref, latest)<br>- Đẩy lên Container Registry (GHCR, Docker Hub) | [`docs/diagrams/deployment.puml`](./diagrams/deployment.puml)<br>(Ranh giới CI/CD & Container Registry) | [`.github/workflows/cd.yml`](../.github/workflows/cd.yml)<br>[`apps/api/Dockerfile`](../apps/api/Dockerfile)<br>[`apps/web/Dockerfile`](../apps/web/Dockerfile)<br>[`.dockerignore`](../.dockerignore) | **CD-PIPE-01**<br><br>**CD-TAG-01**<br><br>**CD-REG-01** | Kiểm tra cú pháp YAML GitHub Actions, kích hoạt trên push `main`/`develop`/`ci/*` và tag `v*`.<br><br>Gắn tag `sha-<commit>`, branch ref, SemVer `vX.Y.Z` và `latest`.<br><br>Đăng nhập & đẩy hình ảnh lên GHCR (`ghcr.io`) và Docker Hub khi có secret. |


