# PTIT EDU (Fullstack)

Website demo fullstack gồm:
- **Backend**: Node.js + Express + MySQL
- **Frontend**: React + Vite

## Chạy nhanh (khuyến nghị)

1) Cài dependencies + import database (chạy 1 lần):
```bash
npm run setup
```

2) Chạy cả backend + frontend:
```bash
npm start
```

Địa chỉ mặc định:
- Backend: `http://localhost:5000`
- Frontend (Vite): `http://localhost:3000`

## Yêu cầu

- Node.js (khuyến nghị LTS)
- MySQL 8.x
- Git

## Clone dự án

```bash
git clone <YOUR_REPO_URL>
cd ptitedu
```

## Cấu hình môi trường (.env)

### Backend

Tạo file `backend/.env` từ mẫu:

```bash
cd backend
copy .env.example .env
```

Sau đó chỉnh các biến (tối thiểu là MySQL):

```env
PORT=5000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=ptit_edu
```

Các biến tuỳ chọn:

```env
GEMINI_API_KEY=
EMAIL_USER=
EMAIL_PASS=
```

### Frontend

Tạo file `frontend/.env` từ mẫu:

```bash
cd ..\frontend
copy .env.example .env
```

Mặc định frontend gọi backend local:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Import database

Dùng script có sẵn (đọc file `csdl/ptit.sql`):

```bash
npm run db:import
```

Nếu muốn reset sạch (xoá DB hiện tại rồi import lại):

```bash
npm run db:import -- --reset
```

## Chạy dự án

### Cách 1: Chạy 1 lệnh (root)

```bash
npm start
```

### Cách 2: Chạy 2 terminal (ổn định nhất trên Windows)

Terminal 1:

```bash
cd backend
npm start
```

Terminal 2:

```bash
cd frontend
npm run dev
```

## Lỗi thường gặp

- **Port 3000 bị chiếm**: Vite sẽ tự nhảy sang port khác (ví dụ 3001). Xem log terminal để biết port chính xác.
- **MySQL access denied / cannot connect**: kiểm tra MySQL đang chạy và các biến `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` trong `backend/.env`.

## Gửi lên GitHub (gợi ý)

Repo đã có `.gitignore` để tránh push `node_modules/`, `dist/`, `.env`, uploads.

```bash
git add .
git commit -m "Initial commit"
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```