# Project Knowledge Template (Mẫu thông tin dự án)

Mục đích: Chuẩn hoá mỗi bài/ project để retrieval và chunking hoạt động ổn định. Dùng định dạng YAML/Markdown để dễ đọc và parse.

Ví dụ schema (YAML):

```yaml
id: projects_craft_0001
title: Case Đồng Hồ Da (Pocket Watch Leather Case)
short_description: Hộp da nhỏ tự làm để đựng pocket watch. Thích hợp cho người mới.
materials:
	- name: leather
		qty: 1 tấm (~20x20cm)
	- name: thread
		qty: 1 cuộn
	- name: needle
		qty: 1
tools:
	- scissors
	- awl
difficulty: easy
duration_minutes: 60
steps:
	- step_number: 1
		description: Cắt da theo mẫu
		time_minutes: 15
	- step_number: 2
		description: Khâu viền
		time_minutes: 30
	- step_number: 3
		description: Hoàn thiện, đánh bóng
		time_minutes: 15
tags: [leather, sewing, reuse]
source_url: https://instructables.com/id/Pocket-Watch-Leather-Case/
images: [url1, url2]
recommended_gesture: show_project
related_projects: [projects_craft_0123, projects_workshop_0456]
```

Hướng dẫn nội dung chi tiết:
- `id`: mã duy nhất cho project (dùng khi link/ghi cache)
- `title`, `short_description`: dùng để hiển thị nhanh
- `materials`: danh sách vật liệu, mỗi mục có `name` và `qty` (tùy chọn)
- `tools`: danh sách dụng cụ cần thiết
- `steps`: danh sách các bước sơ lược (bản tóm tắt để hiển thị), không cần quá chi tiết nếu đã có link nguồn
- `difficulty`, `duration_minutes`, `tags`: metadata để lọc/gợi ý
- `source_url`, `images`: đường dẫn tới trang chi tiết/ảnh minh họa
- `recommended_gesture`: tên gesture gợi ý khi hiển thị project

Phần dùng khi trả về câu trả lời từ chatbot:
- Khi user hỏi "Cho tôi xem dự án X", trả `project` object gồm các trường trên, kèm `steps_summary` (3-5 bước tóm tắt) và `materials` danh sách ngắn.
- Nếu user yêu cầu "Chi tiết bước 2", trả phần `steps` tương ứng và gợi ý `gesture` = `explain_point`.

Ghi chú về chunking/embedding:
- Mỗi project nên được lưu thành một record/tiêu đề riêng, nội dung chi tiết (bước-by-step) có thể tách thành các đoạn ~300-500 token để indexing.
- Giữ `id` ổn định để dễ tham chiếu từ recommender.
