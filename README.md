# Thống kê bài đăng Facebook

Extension Chrome đọc Nhật ký hoạt động để đếm bài bạn đã đăng trên trang cá nhân
và trong nhóm. Bảng và CSV có một dòng cho mỗi tháng trong khoảng ngày đã chọn,
kể cả tháng có 0 bài.

## Cài đặt

1. Giải nén gói tải xuống.
2. Mở `chrome://extensions` và bật **Chế độ dành cho nhà phát triển**.
3. Chọn **Tải tiện ích đã giải nén** rồi chọn thư mục chứa `manifest.json`.

## Sử dụng

1. Đăng nhập Facebook, nhấn biểu tượng tiện ích rồi chọn **Mở Nhật ký hoạt động Facebook**.
2. Trong bảng ở góc dưới bên phải, chọn **Từ ngày** và **Đến ngày**. Hai ngày này đều được tính.
3. Bấm **Quét trang cá nhân**. Đợi trạng thái báo đã quét, rồi bấm **Quét nhóm**.
   Giữ tab mở trong khi Facebook tải thêm dữ liệu. Có thể bấm **Dừng** để hủy lượt quét.
4. Bấm **Xuất CSV**. CSV dùng UTF-8 với BOM và gồm Tháng, Bài trên trang cá nhân,
   Bài trong nhóm, Tổng. Tháng được ghi theo dạng YYYY-MM.

Tiện ích mở hai mục bài đăng của Nhật ký hoạt động và cuộn để đọc các mục Facebook
hiển thị. Bộ đọc hỗ trợ cách ghi ngày phổ biến bằng tiếng Việt và tiếng Anh. Ngày
hiển thị trong nhật ký được dùng như ngày địa phương. Với dấu thời gian máy đọc được
có múi giờ, tiện ích chuyển về múi giờ của trình duyệt. Những mục thiếu ngày được
hiển thị riêng trong trạng thái và bỏ qua khi cộng. Độ đầy đủ phụ thuộc các mục mà
Facebook tải và cách Facebook hiển thị Nhật ký hoạt động. Bố cục Facebook có thể
thay đổi. Tiện ích giữ một khoảng ngày đã quét gần nhất cho mỗi đường dẫn nhật ký.
Bạn có thể xóa toàn bộ dữ liệu lưu của tiện ích bằng cách gỡ tiện ích khỏi Chrome.

Dữ liệu lưu trong Chrome chỉ gồm khoảng ngày, số lượng theo tháng và số mục thiếu
ngày. Nội dung bài viết chỉ được đọc trong tab khi quét. Tiện ích không gửi dữ liệu
đến máy chủ của tiện ích và không sử dụng các thao tác xóa của dự án gốc.

Fork cục bộ từ [khaledsabae/fb-cleaner](https://github.com/khaledsabae/fb-cleaner)
tại commit `169eed9`. Giữ nguyên giấy phép MIT và ghi công của dự án gốc.
