# Cloudinary setup cho ai-service

Tài liệu này hướng dẫn thay Firebase Storage bằng Cloudinary (chỉ cho ảnh), còn Firestore/Auth vẫn giữ nguyên.

## 1) Tạo tài khoản và lấy thông tin Cloudinary

1. Đăng ký/đăng nhập tại https://cloudinary.com.
2. Vào Dashboard.
3. Lấy 3 giá trị:
- `Cloud name`
- `API Key`
- `API Secret`

## 2) Cấu hình biến môi trường

Cập nhật file `.env` trong thư mục `ai-service`:

```env
FIREBASE_WEB_API_KEY=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=cygar
```

Ghi chú:
- `CLOUDINARY_FOLDER` là thư mục gốc trên Cloudinary để gom ảnh theo dự án.
- Không commit `.env` lên git.

## 3) Cài dependency

Trong thư mục `ai-service`:

```bash
pip install -r requirements.txt
```

## 4) Khởi động lại backend

Sau khi sửa `.env`, luôn restart backend để nạp env mới.

## 5) Logic ảnh sau khi chuyển sang Cloudinary

### Endpoint `POST /add-session`
- Ảnh upload từ client được convert sang WebP trong RAM (`BytesIO`).
- Backend upload trực tiếp lên Cloudinary.
- Firestore lưu metadata ảnh gồm:
  - `image_url`: URL Cloudinary (secure_url)
  - `cloudinary_public_id`
  - `relative_path`/`storage_path`: giữ tương thích dữ liệu cũ, giá trị là `public_id` trên Cloudinary

### Endpoint `POST /execute`
- Không đọc ảnh từ local disk.
- Backend lấy `image_url` (hoặc dựng từ `cloudinary_public_id`) rồi tải bytes về để chạy YOLO.

## 6) Cấu trúc lưu ảnh trên Cloudinary

Theo code hiện tại:

`<CLOUDINARY_FOLDER>/users/<uid>/sessions/<session_id>/<filename_without_ext>.webp`

Ví dụ:

`cygar/users/abc123/sessions/9f8e.../image-a1b2c3d4`

## 7) Cách kiểm tra nhanh

1. Gọi `POST /add-session` từ frontend.
2. Kiểm tra response có `images[].image_url`.
3. Mở URL ảnh để xác nhận ảnh truy cập được.
4. Gọi `POST /execute` với `session_id` vừa tạo.

## 8) Lỗi thường gặp

### `Thiếu cấu hình Cloudinary`
Thiếu một trong các biến:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### `Upload ảnh lên Cloudinary thất bại`
Kiểm tra:
- API key/secret có đúng không.
- Tài khoản Cloudinary có bị giới hạn/quota không.
- Server có internet để gọi Cloudinary API.

### `Không thể tải ảnh từ Cloudinary`
Kiểm tra:
- `image_url` còn hợp lệ.
- Ảnh có bị xóa trên Cloudinary không.
- Kết nối mạng outbound từ server.

## 9) Bảo mật khuyến nghị

- Chỉ dùng `API Secret` ở backend.
- Không trả `API Secret` về frontend.
- Nếu cần giới hạn truy cập ảnh, có thể dùng signed URL hoặc delivery type private/authenticated ở bước nâng cao.
