# Mô tả collection users trong Firestore

Collection users trong Firestore thường được sử dụng để lưu trữ thông tin hồ sơ của mỗi người dùng trong ứng dụng của bạn. Đây là một thực thể trung tâm và là một practice tốt khi có một collection riêng cho mỗi thực thể chính.

Mỗi tài liệu (document) trong collection users thường sẽ có:

```json
{
  "display_name": "yuika",
  "email": "test@gmail.com",
  "usage_count": 0,
  "last_updated": "March 31, 2026 at 10:56:01 PM UTC+7",
  "history": [
    {
      "action": "",
      "target_id": "",
      "target_name": "",
      "timestamp": "March 31, 2026 at 10:57:57 PM UTC+7"
    }
  ],
  "viewed_recipes": [""]
}
```
