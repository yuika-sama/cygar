# API Documentation - AI Service Backend

## 1. Tổng quan

Backend được xây dựng bằng FastAPI, tích hợp Firebase Authentication và Firestore.

- Framework: FastAPI
- Auth: Firebase ID Token (Bearer)
- Content-Type: `application/json` (trừ endpoint upload ảnh)
- Auto docs mặc định của FastAPI:
  - Swagger UI: `/docs`
  - ReDoc: `/redoc`

## 2. Cấu hình môi trường

Yêu cầu file `.env` chứa:

```env
FIREBASE_WEB_API_KEY=your_firebase_web_api_key
```

Yêu cầu file `serviceAccountKey.json` hợp lệ tại thư mục gốc `ai-service`.

## 3. Base URL

Khi chạy local mặc định:

```text
http://localhost:8000
```

## 4. Authentication

Các endpoint cần đăng nhập sử dụng header:

```http
Authorization: Bearer <firebase_id_token>
```

Nếu token không hợp lệ/hết hạn, API trả về:

- Status: `401 Unauthorized`
- Body:

```json
{
  "detail": "Token không hợp lệ hoặc đã hết hạn"
}
```

## 5. API Endpoints

---

### 5.1 Đăng nhập

**POST** `/auth/login`

Đăng nhập bằng email/password qua Firebase REST API, trả về Firebase ID token để gọi các API bảo vệ.

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

#### Response 200

```json
{
  "status": "success",
  "access_token": "<firebase_id_token>",
  "expires_in": "3600"
}
```

#### Response lỗi

- `401 Unauthorized`

```json
{
  "detail": "Email hoặc mật khẩu không chính xác"
}
```

- `500 Internal Server Error`

```json
{
  "detail": "Lỗi cấu hình server: Thiếu FIREBASE_WEB_API_KEY"
}
```

---

### 5.2 Lấy thông tin dashboard

**GET** `/dashboards`

Yêu cầu Bearer token. Trả về tổng lượt sử dụng và số lượng lịch sử đã xem.

#### Headers

```http
Authorization: Bearer <firebase_id_token>
```

#### Response 200

```json
{
  "usage_count": 12,
  "viewed_history_count": 5
}
```

#### Response lỗi

- `404 Not Found`

```json
{
  "detail": "Không tìm thấy dữ liệu người dùng"
}
```

---

### 5.3 Lấy lịch sử gần nhất

**GET** `/history`

Yêu cầu Bearer token. Trả về tối đa 10 phần tử lịch sử gần nhất của user.

#### Headers

```http
Authorization: Bearer <firebase_id_token>
```

#### Response 200

```json
[
  {
    "session_id": "abc123",
    "timestamp": "2026-04-06T08:00:00Z",
    "result": {
      "materials": ["Gỗ Sồi"]
    }
  }
]
```

Lưu ý: cấu trúc object trong mảng phụ thuộc dữ liệu thực tế đã lưu trong Firestore.

#### Response lỗi

- `404 Not Found`

```json
{
  "detail": "Không tìm thấy dữ liệu người dùng"
}
```

---

### 5.4 Execute nhận diện từ ảnh

**POST** `/add-session`

Tạo session mới từ danh sách ảnh: ảnh sẽ được nén sang webp và lưu metadata vào Firestore.

#### Headers

```http
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data
```

#### Form Data

- `images`: danh sách file ảnh (cùng key `images` nhiều lần)

#### Ví dụ curl

```bash
curl -X POST "http://localhost:8000/add-session" \
  -H "Authorization: Bearer <firebase_id_token>" \
  -F "images=@./image1.jpg" \
  -F "images=@./image2.png"
```

#### Response 200

```json
{
  "status": "success",
  "session_id": "f54a9fbc-468d-4a8d-b492-83c5e56b4d5e",
  "session_name": "Phiên 20260407-143155",
  "uid": "firebase-user-uid",
  "images": [
    {
      "original_name": "image1.jpg",
      "converted_name": "image1.webp",
      "relative_path": "uploads/<uid>/<session_id>/image1.webp",
      "image_url": "http://localhost:8000/uploads/<uid>/<session_id>/image1.webp",
      "mime_type": "image/webp",
      "width": 1024,
      "height": 768,
      "size_bytes": 52344
    }
  ]
}
```

---

### 5.5 Execute nhận diện từ session

**POST** `/execute`

Yêu cầu Bearer token và `session_id` đã tạo từ `/add-session`.

#### Headers

```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "session_id": "f54a9fbc-468d-4a8d-b492-83c5e56b4d5e"
}
```

#### Response 200

```json
{
  "status": "success",
  "execution_id": "b5c39fd6-cabf-4e73-a632-45f9fbf0f2b0",
  "session_id": "f54a9fbc-468d-4a8d-b492-83c5e56b4d5e",
  "session_name": "Phiên 20260407-143155",
  "detection_result": {
    "detected_labels": ["PET", "plastic_bottle"],
    "label_frequency": {
      "PET": 2,
      "plastic_bottle": 1
    },
    "images": [
      {
        "original_name": "image1.jpg",
        "converted_name": "image1.webp",
        "relative_path": "uploads/<uid>/<session_id>/image1.webp",
        "image_url": "http://localhost:8000/uploads/<uid>/<session_id>/image1.webp",
        "mime_type": "image/webp",
        "width": 1024,
        "height": 768,
        "size_bytes": 52344,
        "detected_objects": [
          {
            "label": "PET",
            "confidence": 0.9821,
            "bbox": { "x1": 12.2, "y1": 24.7, "x2": 512.6, "y2": 720.9 }
          }
        ]
      }
    ]
  },
  "recommendation_result": {
    "recipes": [],
    "by_label": {}
  },
  "post_info": {
    "uid": "firebase-user-uid",
    "created_at": "2026-04-07T07:26:22.123456+00:00",
    "total_images": 2
  }
}
```

---

### 5.6 Lấy thông tin user hiện tại

**GET** `/me`

Yêu cầu Bearer token. Trả về `email` và `display_name`.

#### Headers

```http
Authorization: Bearer <firebase_id_token>
```

#### Response 200 (khi có dữ liệu Firestore)

```json
{
  "email": "user@example.com",
  "display_name": "Nguyen Van A"
}
```

#### Response 200 (khi chưa có document user)

```json
{
  "email": "user@example.com",
  "display_name": null
}
```

---

### 5.7 Đăng xuất

**POST** `/auth/logout`

Yêu cầu Bearer token. Thu hồi toàn bộ refresh token của user.

#### Headers

```http
Authorization: Bearer <firebase_id_token>
```

#### Response 200

```json
{
  "status": "success",
  "message": "Đăng xuất thành công, tất cả phiên bản token đã bị thu hồi."
}
```

#### Response lỗi

- `500 Internal Server Error`

```json
{
  "detail": "Lỗi khi xử lý đăng xuất"
}
```

## 6. Error Format chung

FastAPI mặc định trả lỗi theo schema:

```json
{
  "detail": "Mô tả lỗi"
}
```

## 7. Gợi ý kiểm thử nhanh

1. Gọi `POST /auth/login` để lấy `access_token`.
2. Gắn token vào header `Authorization: Bearer <token>`.
3. Test tuần tự các endpoint bảo vệ: `/me`, `/dashboards`, `/history`, `/execute`, `/auth/logout`.
