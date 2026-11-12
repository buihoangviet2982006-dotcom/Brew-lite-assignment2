## 1. Tóm tắt thay đổi (Summary)
<!-- Mô tả ngắn gọn nội dung thay đổi trong Pull Request này -->
- 

## 2. Lý do thay đổi & Liên kết truy vết (Motivation & Traceability)
<!-- Bắt buộc ghi rõ lý do nếu có thay đổi yêu cầu, sơ đồ UML hoặc kiến trúc (Task 4.2) -->
- **Task / Issue ID:** `#S1-__` / `#S2-__`
- **Mã yêu cầu liên quan (SRS):** `FR-__`, `NFR-__`
- **Lý do thay đổi:** 

## 3. Loại thay đổi (Type of Change)
- [ ] `feat`: Thêm mới tính năng (Frontend / Backend)
- [ ] `fix`: Sửa lỗi logic, giao diện hoặc cấu hình
- [ ] `docs`: Cập nhật tài liệu SRS, Use-case, sơ đồ UML, ADR, README, Backlog
- [ ] `test`: Bổ sung hoặc cập nhật Unit / Integration / E2E Test
- [ ] `ci`: Cấu hình GitHub Actions CI/CD hoặc Docker
- [ ] `refactor` / `chore`: Tái cấu trúc mã nguồn hoặc cập nhật cấu hình

## 4. Checklist Quality Gate & Definition of Done (DoD)
<!-- Pull Request KHÔNG ĐƯỢC MERGE nếu bất kỳ bước bắt buộc nào dưới đây thất bại -->
- [ ] **Commit Convention:** Các commit tuân thủ chuẩn `<type>(<scope>): <subject>`.
- [ ] **Linting (`npm run lint`):** Đã chạy thành công, không có lỗi cú pháp hay quy chuẩn code.
- [ ] **Automated Tests (`npm run test`):** Toàn bộ Unit, Integration và Component Tests đều `PASS`.
- [ ] **Build (`npm run build`):** Cả `@brewlite/api` và `@brewlite/web` đều build thành công.
- [ ] **UI States (nếu có thay đổi Frontend):** Đã xử lý đầy đủ các trạng thái `loading`, `empty`, `error` và `success` theo chuẩn Mobile-First.
- [ ] **Bảo mật & Cấu hình:** Không chứa khóa bí mật (`.env`, JWT secret, API key) trong mã nguồn hoặc log.
- [ ] **Truy vết (`docs/traceability-matrix.md`):** Đã cập nhật ma trận truy vết và tài liệu liên quan trong `docs/`.

