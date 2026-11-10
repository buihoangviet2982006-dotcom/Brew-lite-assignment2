# ADR 003: Quản lý dữ liệu quan hệ với PostgreSQL và Prisma Migration

* **Trạng thái:** Đã chấp nhận (Accepted)
* **Ngày quyết định:** 2026-11-09
* **Người tham gia:** Bùi Hoàng Việt, Nguyễn Quang Đạt

## 1. Bối cảnh (Context)
Dự án BrewLite yêu cầu lưu trữ thông tin sản phẩm, tùy chọn size/topping, tài khoản người dùng và lịch sử đơn hàng/thanh toán. Nghiệp vụ tạo đơn và thanh toán đòi hỏi tính toàn vẹn dữ liệu tuyệt đối (không để xảy ra tình trạng trừ tiền nhưng không ghi nhận đơn, hoặc bán vượt số lượng tồn kho). Ngoài ra, cấu trúc database cần có khả năng tái tạo tự động trên cả 3 môi trường: Local, CI Runner và Production.

## 2. Quyết định (Decision)
1. Sử dụng hệ quản trị cơ sở dữ liệu quan hệ **PostgreSQL 16**.
2. Sử dụng **Prisma ORM** làm công cụ quản lý schema, thao tác dữ liệu và thực hiện migration:
   - Ở môi trường Local: Tạo và kiểm thử migration qua `npx prisma migrate dev`.
   - Ở môi trường CI và Production: Tự động áp dụng migration qua lệnh `npx prisma migrate deploy` trong pipeline CD trước khi khởi chạy API.
   - Quản lý dữ liệu khởi tạo thông qua script `prisma/seed.ts`.
3. Gắn **Docker Persistent Volume** (`pgdata`) cho PostgreSQL để đảm bảo dữ liệu không bị xóa khi container khởi động lại.

## 3. Các phương án đã cân nhắc (Alternatives Considered)
- **MongoDB / NoSQL:** Linh hoạt về schema nhưng thiếu hỗ trợ mạnh mẽ cho quan hệ nhiều-nhiều phức tạp giữa Order, OrderItem, Topping và khó kiểm soát ràng buộc toàn vẹn khóa ngoại.
- **TypeORM:** Hỗ trợ tốt nhưng việc quản lý migration bằng TypeScript đôi khi phát sinh lỗi không nhất quán khi chạy trên môi trường production container.

## 4. Hệ quả & Đánh đổi (Consequences)
* **Tích cực:**
  - Hỗ trợ đầy đủ ACID Transaction (`prisma.$transaction`) cho luồng đặt hàng.
  - Lịch sử thay đổi cơ sở dữ liệu được phiên bản hóa thành các file `.sql` rõ ràng trong Git.
  - Tự động sinh kiểu dữ liệu (TypeScript types) đồng bộ giữa database và API.
* **Đánh đổi / Hạn chế:** Cần chạy lệnh `prisma generate` trong Dockerfile và pipeline CI trước khi build mã nguồn NestJS.