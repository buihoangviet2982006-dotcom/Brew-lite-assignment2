# ADR 001: Sử dụng cấu trúc Monorepo cho toàn bộ dự án

* **Trạng thái:** Đã chấp nhận (Accepted)
* **Ngày quyết định:** 2026-11-09
* **Người tham gia:** Toàn bộ thành viên nhóm BrewLite

## 1. Bối cảnh (Context)
Dự án BrewLite bao gồm ứng dụng Web/PWA (Next.js), Backend API (NestJS), bộ tài liệu đặc tả & kiến trúc (`docs/`), các kịch bản kiểm thử tích hợp (`tests/`), và cấu hình triển khai Docker/CI-CD. Việc chia thành nhiều repository độc lập (Polyrepo) sẽ gây khó khăn cho việc đồng bộ mã nguồn, chia sẻ kiểu dữ liệu (DTO/Types), và theo dõi tiến độ theo 2 Sprint ngắn hạn.

## 2. Quyết định (Decision)
Tổ chức toàn bộ mã nguồn hệ thống trong một Git Repository duy nhất theo cấu trúc **Monorepo**:
- `apps/web`: Ứng dụng Frontend Next.js mobile-first/PWA.
- `apps/api`: Dịch vụ Backend NestJS.
- `docs/`: Tài liệu SRS, sơ đồ thiết kế hệ thống và quyết định kiến trúc.
- `tests/`: Kịch bản kiểm thử tích hợp và E2E liên tầng.

## 3. Các phương án đã cân nhắc (Alternatives Considered)
- **Polyrepo (Tách riêng repo cho Web, API, Docs):** Dẫn đến tình trạng lệch phiên bản giữa Frontend và Backend; khó truy vết một tính năng xuyên suốt từ tài liệu đến mã nguồn trong cùng một Pull Request.

## 4. Hệ quả & Đánh đổi (Consequences)
* **Tích cực:** 
  - Một commit hoặc Pull Request có thể bao hàm cả tài liệu, backend và frontend, đáp ứng tiêu chí truy vết của Assignment 2.
  - Quản lý chung một bộ cấu hình Docker (`docker-compose.yml`) và GitHub Actions workflow.
* **Đánh đổi / Hạn chế:** Pipeline CI cần thiết lập bước kiểm tra theo đường dẫn (path filtering) để tránh build lại toàn bộ hệ thống khi chỉ thay đổi tài liệu trong thư mục `docs/`.