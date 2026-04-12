# Gesture Catalog (Danh sách cử chỉ / animation gợi ý)

Tệp này mô tả các cử chỉ (gesture) mà chatbot có thể trả về kèm theo mỗi câu trả lời. Backend / frontend sẽ map tên cử chỉ này sang animation (ví dụ Live2D motions hoặc CSS/JS animation).

Trường dữ liệu khuyến nghị mỗi hàng:
- `gesture`: mã tên cử chỉ (string)
- `when_to_use`: mô tả ngắn khi nào sử dụng
- `description`: mô tả chi tiết
- `sample_triggers`: ví dụ câu người dùng (tiếng Việt) kích hoạt cử chỉ này
- `suggested_runtime_motion`: (tùy chọn) tên file motion gợi ý hoặc tag để map vào runtime

| gesture | when_to_use | description | sample_triggers | suggested_runtime_motion |
| --- | --- | --- | --- | --- |
| neutral_idle | Trả lời thông tin chuẩn | Trạng thái trung tính khi cung cấp thông tin ngắn | "Cho mình biết về..." | Idle.vrma |
| greet_wave | Chào hỏi bắt đầu phiên | Vẫy tay thân thiện khi user chào hoặc bắt đầu | "Xin chào", "Chào bạn" | Goodbye.vrma |
| bow_polite | Chào lịch sự | Cúi chào ngắn (formal) | "Chào anh", "Xin chào" | Idle.vrma |
| explain_point | Giải thích bước/khái niệm | Gợi ý ngón tay/chỉ vào nội dung khi giải thích | "Làm thế nào để...", "Giải thích cho mình" | LookAround.vrma |
| think_tilt | Khi cần xử lý hoặc suy nghĩ | Đầu nghiêng, biểu hiện đang suy nghĩ khi cần request thêm thời gian xử lý | "Đợi chút", "Tôi đang kiểm tra" | Thinking.vrma |
| suggest_action | Đề xuất hành động tiếp theo | Khi chatbot đưa ra hướng hành động hoặc link | "Bạn có thể thử...", "Gợi ý" | Relax.vrma |
| show_project | Hiển thị thông tin dự án | Khi trả về chi tiết project (title + mô tả + link) | "Cho tôi xem dự án", "Mở dự án" | LookAround.vrma |
| list_items | Liệt kê danh sách | Khi trả về danh sách mục (vật liệu, bước) | "Danh sách vật liệu", "Các bước" | LookAround.vrma |
| highlight_materials | Nhấn mạnh vật liệu | Khi chatbot nêu danh sách vật liệu quan trọng | "Vật liệu cần có là..." | Blush.vrma |
| navigate_next | Điều hướng sang mục tiếp theo | Khi user yêu cầu "tiếp theo" hoặc next page | "Tiếp theo", "Kế" | Jump.vrma |
| navigate_prev | Điều hướng về mục trước | Khi user yêu cầu "trước" hoặc previous | "Quay lại", "Trước" | Jump.vrma |
| open_link_hand | Kêu gọi mở liên kết | Khi chatbot gợi ý mở link để xem chi tiết | "Mở liên kết", "Xem trang" | Goodbye.vrma |
| celebrate_success | Xác nhận hoàn thành/ thành công | Khi user báo hoàn thành hoặc đạt kết quả | "Đã xong", "Hoàn thành" | Clapping.vrma |
| empathy_soft | Thể hiện cảm thông | Khi user bày tỏ khó khăn, thất vọng | "Tôi không làm được", "Gặp lỗi" | Sad.vrma |
| ask_clarify | Yêu cầu làm rõ | Khi cần thêm thông tin từ user để trả lời chính xác | "Bạn có thể mô tả kỹ hơn không?" | Thinking.vrma |
| error_shrug | Báo lỗi không có dữ liệu | Khi không tìm được thông tin phù hợp | "Mình chưa có thông tin này" | Surprised.vrma |

Lưu ý triển khai:
- Frontend nên map tên `suggested_runtime_motion` thành file motion tương ứng trong `fe/public/runtime/motion/`.
- Khi trả về response, model nên có trường `gesture` chứa một trong các `gesture` ở trên.
- Nếu không chắc, trả về `neutral_idle` làm fallback.
