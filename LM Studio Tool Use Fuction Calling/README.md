# LM Studio MCP

Đây là hệ thống kết nối các mô hình AI chạy local trên **LM Studio** với thế giới bên ngoài thông qua **Model Context Protocol (MCP)**. 
Dự án cung cấp khả năng tìm kiếm web (Web Search) và đọc/ghi file (Filesystem) cho các mô hình AI, kết hợp với giao diện UI React (Dependency Injection architecture).

## Yêu cầu
- Node.js >= 18
- LM Studio đang chạy với Local Server (mặc định port `1234`)
- Khuyến nghị sử dụng các model hỗ trợ tool calling như: `Qwen 3.5`, `Gemma 4` hoặc các model tương tự.

## Cấu trúc thư mục
- `backend/`: Node.js Express server + MCP Client hub.
- `frontend/`: React + Vite UI.

## Cài đặt và Chạy

### 1. Khởi động LM Studio
- Mở LM Studio.
- Tải và load model bạn muốn sử dụng (ví dụ: `qwen3.5-9b-uncensored`).
- Bật **Local Server** (ở menu bên trái, biểu tượng `<->`). Mặc định port là `1234`.

### 2. Chạy Backend
```bash
cd "LM Studio MCP/backend"
npm install
npm run dev
```
*(Lưu ý: Mở file `backend/.env` để cấu hình thư mục được phép truy cập và API Key tìm kiếm nếu cần)*

### 3. Chạy Frontend
Mở một terminal mới:
```bash
cd "LM Studio MCP/frontend"
npm install
npm run dev
```

### 4. Sử dụng
- Truy cập UI tại địa chỉ `http://localhost:5173`.
- Bật/tắt các tính năng (Web Search, Filesystem) qua thanh toggle ở trên cùng.
- Chọn model và bắt đầu chat!
