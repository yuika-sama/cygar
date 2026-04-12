# Chatbot Knowledge — Hướng dẫn sử dụng

Thư mục này là kho tri thức chính cho cơ chế RAG (retrieval-augmented generation) của chatbot. Nội dung ở đây dùng để trả lời các câu hỏi về dự án, vật liệu, hướng dẫn thực hành và điều hướng UI.

## Các tệp chính

- `preprompt_template.md`: mẫu preprompt (quy tắc system) để cấu hình hành vi assistant.
- `gesture_catalog.md`: danh sách cử chỉ (gesture) mà assistant gợi ý kèm mỗi đáp án.
- `project_knowledge_template.md`: mẫu chuẩn để lưu thông tin từng project/bài hướng dẫn.
- `external_websites.md`: danh sách nguồn tham khảo tin cậy và quy tắc trích dẫn.

## Cách hoạt động (tóm tắt kỹ thuật)

- Backend/ingestion: tải các file markdown trong thư mục này cùng với `ai-service/docs` và các CSV trong `utils/dataset/`.
- Embedding: các đoạn văn sẽ được embedding (ví dụ: SentenceTransformer) và lưu để tìm kiếm tương tự.
- Retrieval: với truy vấn người dùng, hệ thống lấy top-k đoạn phù hợp và dùng RAG để sinh câu trả lời.

## Hướng dẫn thêm/ cập nhật knowledge

1. Thêm file markdown theo `project_knowledge_template.md` cho mỗi project hoặc chủ đề mới.
2. Cập nhật `external_websites.md` nếu muốn cho phép trích dẫn nguồn mới.
3. Nếu thêm gesture mới, cập nhật `gesture_catalog.md` và map tên gesture vào animation file ở frontend (`fe/public/runtime/motion/`).
4. Sau thay đổi lớn, rebuild index embeddings (cơ chế tùy theo pipeline của bạn).

## Format trả về khuyến nghị từ model (ví dụ JSON payload)

Model nên trả về một cấu trúc rõ ràng để frontend dễ render:

```json
{
	"text": "Trả lời ngắn gọn bằng tiếng Việt",
	"details": "Giải thích thêm hoặc các bước tóm tắt",
	"gesture": "show_project",
	"project": { "title": "...", "short_description": "...", "materials": ["..."], "steps_summary": ["..."] },
	"navigation": ["Tiếp theo","Mở liên kết"],
	"suggested_articles": [ {"title":"...","link":"...","match_score":0.92} ]
}
```

## Ví dụ hội thoại & gesture (tiếng Việt)

- User: "Xin chào"  → Assistant trả `text` + `gesture`: `greet_wave`.
- User: "Cho tôi xem dự án làm túi từ vải vụn" → Assistant trả `project` + `gesture`: `show_project`.
- User: "Gợi ý dự án theo vật liệu: chai nhựa, giấy" → Assistant gọi flow recommend và trả `suggested_articles` + `gesture`: `list_items`.
- User: "Tiếp theo" → Assistant trả navigation: `next` + `gesture`: `navigate_next`.

## Tích hợp gợi ý theo vật liệu

- Pipeline: Chuẩn hoá input vật liệu -> gọi `OptimizedRecyclingRecommender` (utils/train.py) hoặc service tương đương -> trả tối đa 5 kết quả gồm tiêu đề, tóm tắt, link, điểm khớp.
- Lưu ý: đảm bảo mapping từ tên vật liệu (synonyms) trước khi gọi recommender.

## Gợi ý các thông tin bạn có thể cung cấp thêm cho AI (để nâng cao chất lượng trả lời)

- Danh sách vật liệu chi tiết (kèm số lượng nếu có).
- Trình độ người dùng (beginner/intermediate/advanced).
- Dụng cụ sẵn có (ví dụ: máy khâu, dao, keo nóng).
- Ngân sách/ giới hạn chi phí.
- Thời gian mong muốn để hoàn thành (ví dụ: <1h, 1-3h, >1 ngày).
- Hình ảnh hoặc link ảnh của vật liệu hiện có (dùng để cải thiện nhận diện hoặc gợi ý phù hợp).
- Ví dụ các project bạn thích (links) để hệ thống hiểu phong cách.
- Ngôn ngữ/giọng điệu mong muốn (trẻ trung / chính thức / chi tiết từng bước).
- Ràng buộc an toàn (ví dụ: tránh dụng cụ nóng, tránh hóa chất).
- Vùng địa lý / khí hậu (để gợi ý vật liệu phù hợp địa phương).
- Bản đồ từ đồng nghĩa (synonyms) cho vật liệu thường dùng (ví dụ: PET -> chai nhựa).
