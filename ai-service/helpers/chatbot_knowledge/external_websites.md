# External Website References — Hướng dẫn & Template

Mục đích: Giữ danh sách các nguồn tin cậy để chatbot tham khảo, trích dẫn và sử dụng khi trả lời. Khi thêm nguồn, điền đủ các trường bên dưới và xác định rõ "usage_rule" (khi nào được phép tham khảo).

Template (YAML-like):

- name: {{SOURCE_NAME}}
	url: {{SOURCE_URL}}
	summary: {{WHAT_THIS_SOURCE_IS_FOR}}     # Mô tả ngắn: nguồn này dùng để làm gì
	usage_rule: {{WHEN_TO_REFERENCE_THIS_SOURCE}}  # Khi nào chatbot được phép trích dẫn
	trust_level: high|medium|low
	last_checked: YYYY-MM-DD

Ví dụ mẫu:

- name: Instructables
	url: https://www.instructables.com
	summary: Hướng dẫn dự án DIY, bước thực hành chi tiết và danh sách vật liệu
	usage_rule: Sử dụng để tham khảo bước-làm và vật liệu khi trả lời về project cụ thể
	trust_level: high
	last_checked: 2026-04-11

- name: Wikipedia — Recycling
	url: https://en.wikipedia.org/wiki/Recycling
	summary: Bài viết tổng quan về khái niệm, phân loại vật liệu và quy trình tái chế
	usage_rule: Dùng để giải thích khái niệm chung, không dùng để thay thế hướng dẫn thi công chi tiết
	trust_level: medium
	last_checked: 2026-04-11

Hướng dẫn thêm nguồn mới:
- Kiểm tra license / terms of use trước khi trích xuất nội dung chi tiết.
- Không thêm nguồn chứa dữ liệu cá nhân nhạy cảm.
- Ghi rõ "usage_rule" để tránh trích dẫn không phù hợp.

Khi trả lời, chatbot chỉ trích dẫn nguồn nếu: (1) câu trả lời dựa trên thông tin chuyên sâu từ nguồn đó, hoặc (2) người dùng yêu cầu "nguồn" hoặc "tham khảo".
