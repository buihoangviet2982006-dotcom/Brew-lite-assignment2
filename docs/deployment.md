# Triển khai lên môi trường thật

BrewLite sử dụng PostgreSQL và API NestJS trên Render, ứng dụng Web Next.js trên
Vercel. GitHub Actions là nơi duy nhất kích hoạt triển khai. Nhánh `main` chỉ
được triển khai sau khi quy trình tích hợp liên tục thành công.

## Cấu hình nhà cung cấp lần đầu

### Cơ sở dữ liệu PostgreSQL trên Render

Tạo một PostgreSQL database riêng cho môi trường thật trên Render. Lấy:

- URL kết nối nội bộ để cấu hình cho API trên Render.
- URL kết nối bên ngoài (External Database URL) để GitHub Actions truy cập khi
  chạy migration. Mật khẩu trong URL phải được mã hóa URL nếu chứa ký tự đặc biệt.

Không lưu URL kết nối hoặc mật khẩu trong kho mã nguồn hay nhật ký CI.

### Dịch vụ API trên Render

Tạo dịch vụ Web Docker kết nối với kho mã nguồn này và cấu hình:

- Nhánh mã nguồn: `main`
- Thư mục gốc: thư mục gốc của kho mã nguồn
- Đường dẫn tệp Docker: `apps/api/Dockerfile`
- Tắt tự động triển khai. GitHub Actions chỉ gọi điểm kích hoạt triển khai
  (Deploy Hook) sau khi migration thành công.
- Các biến môi trường:
  - `NODE_ENV=production`
  - `DATABASE_URL`: URL kết nối nội bộ của PostgreSQL trên Render
  - `DIRECT_URL`: cùng URL kết nối nội bộ; API không chạy migration lúc khởi động
  - `JWT_SECRET`: khóa bí mật có độ ngẫu nhiên cao, tạo riêng cho môi trường thật
  - `CORS_ORIGIN`: chính xác tên miền gốc của Vercel
  - `SEPAY_WEBHOOK_SECRET`: khóa webhook mới, chỉ dùng cho môi trường thật
  - `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` và
    `VIETQR_TEMPLATE`: cấu hình ngân hàng môi trường thật
- Cấu hình kiểm tra tình trạng hoạt động tại `/health`.
- Tạo điểm kích hoạt triển khai cho nhánh `main`, sau đó lưu toàn bộ URL thành
  bí mật `RENDER_DEPLOY_HOOK` trong GitHub Environment.

Không dùng mật khẩu cơ sở dữ liệu làm `JWT_SECRET` hay khóa webhook.

### Ứng dụng Web trên Vercel

Kết nối kho mã nguồn với Vercel và đặt thư mục gốc dự án là `apps/web`. Trong
môi trường thật của Vercel, đặt `NEXT_PUBLIC_API_URL` bằng tên miền gốc của API
Render và cấu hình các biến VietQR/thông tin ứng dụng công khai cần thiết.

Tắt tự động triển khai, tạo điểm kích hoạt triển khai thật cho nhánh `main`, rồi
lưu toàn bộ URL thành bí mật `VERCEL_DEPLOY_HOOK` trong GitHub Environment.

## Cấu hình GitHub Actions

Tạo GitHub Environment tên `production`. Chỉ cho phép nhánh `main` sử dụng môi
trường này; nếu gói GitHub hỗ trợ, yêu cầu người có quyền phê duyệt trước khi
chạy các bước triển khai thật.

Thêm các **bí mật của môi trường (Environment Secrets)** sau:

| Tên bí mật            | Giá trị                                      |
| --------------------- | -------------------------------------------- |
| `RENDER_DATABASE_URL` | URL kết nối PostgreSQL bên ngoài trên Render |
| `RENDER_DEPLOY_HOOK`  | URL kích hoạt triển khai API trên Render     |
| `VERCEL_DEPLOY_HOOK`  | URL kích hoạt triển khai Web trên Vercel     |

`RENDER_DATABASE_URL` chỉ được dùng trong GitHub Actions để chạy migration.
Trong Render, API phải dùng URL kết nối **nội bộ** của database.

Thêm các **biến của môi trường (Environment Variables)** sau:

| Biến                 | Giá trị                                                  |
| -------------------- | -------------------------------------------------------- |
| `API_PRODUCTION_URL` | Tên miền gốc API Render, ví dụ `https://api.example.com` |
| `WEB_PRODUCTION_URL` | Tên miền gốc Vercel, ví dụ `https://example.com`         |

Workflow không in URL kích hoạt triển khai hoặc chuỗi kết nối cơ sở dữ liệu ra
nhật ký. Bảo vệ nhánh `main` bằng yêu cầu duyệt mã và trạng thái CI thành công.

## Thứ tự triển khai và migration

`.github/workflows/cd.yml` chỉ chạy sau khi workflow **Tích hợp liên tục** thành
công trên nhánh `main`. Không có đường triển khai thủ công bỏ qua CI. Workflow
không chạy song song nhiều đợt triển khai và kiểm tra mã nguồn đã được kiểm thử
có còn là phiên bản mới nhất của `main` hay không.

Các bước triển khai:

1. Chạy `prisma migrate deploy` trên PostgreSQL của Render bằng URL kết nối bên
   ngoài. Prisma chỉ áp dụng những migration chưa được ghi nhận là đã chạy.
2. Nếu migration thất bại, dừng quy trình; không gọi điểm kích hoạt triển khai
   API hoặc Web.
3. Kích hoạt triển khai API trên Render và chờ `/health` phản hồi thành công.
4. Kích hoạt triển khai Web trên Vercel và chờ `/menu` hoạt động.

Không chạy `prisma db push` trên môi trường thật. Chỉ thay đổi schema bằng các
tệp migration đã được kiểm tra và duyệt. Thiết kế thay đổi theo mô hình mở rộng/thu hẹp
(expand/contract) để API đang chạy vẫn tương thích trong khi áp dụng migration.
Sao lưu dữ liệu trước các migration có thể xóa hoặc viết lại dữ liệu. Prisma
không tự hoàn tác migration đã áp dụng: nếu triển khai ứng dụng thất bại sau
migration, giữ ứng dụng cũ tương thích và triển khai bản sửa tiếp theo; chỉ khôi
phục từ bản sao lưu theo quy trình khôi phục đã được duyệt.

## Migration khởi tạo và cơ sở dữ liệu hiện có

Kho mã nguồn có migration khởi tạo tại
`apps/api/prisma/migrations/20261115143000_initial_schema`. Migration tạo schema
từ `apps/api/prisma/schema.prisma` trong một giao dịch PostgreSQL.

Với PostgreSQL trên Render **mới và chưa có bảng**, CI sẽ áp dụng migration này
theo quy trình thông thường. Nếu cơ sở dữ liệu đã có bảng được tạo bằng
`prisma db push` hoặc công cụ khác, không chạy migration khởi tạo một cách mù
quáng vì sẽ xung đột với các đối tượng hiện có. Trước tiên, sao lưu và xác minh
schema hiện tại khớp chính xác với migration khởi tạo. Chỉ sau khi xác minh,
người vận hành mới được đánh dấu migration này là đã áp dụng một lần:

```powershell
$env:DATABASE_URL = "<URL kết nối PostgreSQL bên ngoài trên Render>"
$env:DIRECT_URL = $env:DATABASE_URL
npx prisma migrate resolve --schema apps/api/prisma/schema.prisma --applied 20261115143000_initial_schema
```

Không đánh dấu migration khởi tạo là đã áp dụng nếu schema bị sai khác. Hãy xử
lý rõ ràng các sai khác và cách bảo toàn dữ liệu trước khi bật migration tự động.

## Kiểm tra tại máy cá nhân

Kiểm tra schema Prisma và sinh Prisma Client mà không kết nối cơ sở dữ liệu:

```powershell
$env:DATABASE_URL = "postgresql://build:build@localhost:5432/build?schema=public"
$env:DIRECT_URL = $env:DATABASE_URL
npm run db:generate
npx prisma validate --schema apps/api/prisma/schema.prisma
```

Workflow triển khai chạy migration trên PostgreSQL thật của Render. Việc kiểm
tra schema tại máy cá nhân không thay thế sao lưu dữ liệu hoặc kiểm tra, duyệt migration.
