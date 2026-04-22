# 📖 Lịch sử Phát triển Hệ thống Điểm danh QR Code (QR Attendance System)

Dự án được xây dựng theo kiến trúc **Modular Monolith** sử dụng **Spring Boot 3 (Java 17)** cho Backend, **MySQL 8.0** cho Database và **Vanilla JS + HTML + CSS Glassmorphism** cho Frontend. Hệ thống được đóng gói bài bản với **Docker & Nginx**. Cụ thể các chặng (Tasks) đã hoàn thành:

## Task 1: Cấu trúc môi trường & Container
- Thiếp lập `docker-compose.yml` định nghĩa MySQL và Java Backend. Tích hợp `NGINX` Frontend sau này.
- Sử dụng `.env` để truyền môi trường DB an toàn (Password, URL).
- Viết `Dockerfile` Multi-stage build tinh gọn giúp khởi chạy ứng dụng nhanh bằng JDK 17.
- Tạo sẵn `Makefile` hỗ trợ bật/tắt dự án siêu tốc.

## Task 2: Ánh xạ Database & JPA Configuration
- Ánh xạ hoàn chỉnh Schema V1 gốc (User, Profile, Subject, Classes, Course, Session, Attendances, Logs).
- Thiết lập `BaseEntity` chuẩn với `@EntityListeners` để tự động chèn dữ liệu Auditing (createdAt).
- Triển khai **Flyway Migration** để khóa cứng phiên bản CSDL và bảo tồn quy định `full_name` tại bảng cấu hình cá nhân `Profile`.

## Task 3: Security & JWT Module
- Xây dựng `JwtUtils` xử lý chữ ký mã thông báo với Secretariat HMAC.
- Cấu hình Filter `JwtAuthenticationFilter` để chặn Token Stateless, bảo vệ phân quyền phân tách (ADMIN, TEACHER, STUDENT).
- Tích hợp chức năng chống xâm nhập Bcrypt.

## Task 4: API Điểm Danh Cốt Lõi
- Khởi tạo chức năng tạo UUID Token mã hóa mã QR giới hạn thời gian mở dành riêng cho Giảng viên cấp tốc.
- Luồng Sinh viên dùng ảnh QR check-in, đối chiếu với DB với GlobalExceptionHandler gắt gao chặn `Duplicate Check-in`.

## Task 5: Frontend Sinh viên Check-in Camera
- Phát triển giao diện Glassmorphism đỉnh cao kết hợp hiệu ứng Blob.
- Liên kết thư viện Web Camera bằng `html5-qrcode`. Code Auto-Fetch gửi Bearer token điểm danh.

## Task 6: Frontend Giảng viên Monitoring
- Tích hợp thêm Backend API phục vụ dữ liệu.
- Hoàn trả JS `create-session.js` hiển thị QR kích thước lớn và chức năng theo dõi danh sách Live View siêu mượt.

## Task 7: Frontend Admin & NGINX Routing
- Chỉnh sửa `nginx.conf` cho mạng Docker định hướng `location /api/` chặn qua Reverse Proxy để vượt lỗi CORS triệt để mà Frontend không cần chỉ định URL cứng.
- Nằm trong nền tảng Mock UI kết hợp module quản lý Admin Dashboard hiện đại màu tối bóng bẩy.

## Task 8/Revision Task 5: Master Cấu Hình Định Tuyến Hệ Thống & Quản trị
- Viết `DataInitializer` sinh tự động siêu tài khoản hệ thống (`admin@qrcode.com` / `admin`).
- Xây dựng phương thức kết giao Spring Boot API: Khi Admin tạo tài khoản mới ở giao diện trên web, API tự động cấp Email dưới bảng User và cấp `full_name` tương ứng chèn vào Profile song hành.
- Khởi tạo file NodeJS Simulator `test_stress.js` để stress test băng thông Database khi lặp sự cố đồng thời ở Sinh viên.

## Task 9/Revision Task 6: Module Đổi Mật Khẩu Cá Nhân
- Xây dựng API Đổi Mật Khẩu `POST /api/user/change-password` dưới phân nhánh `UserController`.
- Tuân thủ nguyên tắc Security: Sử dụng hàm native `passwordEncoder.matches()` băm nhỏ dữ liệu và xác minh tính trọn vẹn của mật khẩu cũ đang đăng nhập trước khi Update mật khẩu mới thành Hash Bcrypt.
- Thiết kế File HTML/JS Độc lập chung tại `frontend/common/change-password.html`. Tính năng lấy JWT LocalStorage động cho phép bất kể là Sinh viên, Giáo viên hay Quản trị viên chỉ cần đăng nhập thành công là vào đổi mật khẩu dễ dàng.

## Task 10: Module Quản lý Cập Nhật Hồ Sơ Cá nhân Nâng Cao
- Xây dựng 2 Endpoint: API `GET/PUT /api/user/profile` với cơ chế Validation một chiều.
- **Tính năng độc quyền Administrator Control**: Các trường bảo mật liên quan tới định danh như `full_name` đã bị chặn hoàn toàn tại cửa ngõ tiếp nhận DTO `ProfileUpdateRequest.java`. Người dùng chỉ có quyền cá nhân hóa các chuỗi độc lập như `avatar` và `phone_number`.
- Thiết kế luồng Frontend dùng chung `frontend/common/profile.html` sử dụng thiết kế hộp hiển thị (Input Field) dạng Disable/Read-Only kết hợp lệnh FETCH mượt mà để phân luồng người dùng cực đoan.
- **Tự động Audit**: Tích hợp chéo `AuditService` để ghi vào Data Base `logs` từng dòng nội dung khi một hồ sơ cá nhân bị chỉnh sửa, giúp bảo toàn tính toàn vẹn hệ thống và phòng chống rủi ro pháp lý.


