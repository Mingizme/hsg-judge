# HƯỚNG DẪN TRIỂN KHAI TOÀN BỘ HỆ THỐNG (100% FREE TIER)

Tài liệu này hướng dẫn chi tiết cách triển khai nền tảng **HSG Judge** hoàn toàn miễn phí, không yêu cầu thẻ tín dụng (No Credit Card Required).

---

## 1. TỔNG QUAN KIẾN TRÚC TRIỂN KHAI

```
┌────────────────────────────────────────────────────────┐
│                   HỌC SINH & GIÁO VIÊN                 │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS
                            ▼
┌────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 14+ / React 18 / Monaco / ReactFlow)│
│  Hosting: Vercel Free Tier (https://*.vercel.app)      │
└─────────────┬───────────────────────────┬──────────────┘
              │ REST API / SSE Stream     │ Embed PDF View
              ▼                           ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│ BACKEND API (NestJS + TS) │  │ SUPABASE STORAGE (Free)   │
│ Hosting: Render hoặc      │  │ Bucket: "problem-pdfs"    │
│ Koyeb Web Service (Free)  │  │ (Public PDF Access)       │
└─────────────┬─────────────┘  └───────────────────────────┘
              │ Prisma ORM
              ▼
┌────────────────────────────────────────────────────────┐
│ DATABASE: Supabase PostgreSQL (500MB Free Tier)        │
│ Auth: Supabase Auth (50,000 MAU Free)                  │
└────────────────────────────────────────────────────────┘
              ▲
              │ HTTP Execution API
┌─────────────┴──────────────────────────────────────────┐
│ ENGINE CHẤM C++ (Sandbox)                              │
│ 1. Judge0 CE on RapidAPI (50 Submissions/day Free)     │
│ 2. Hoặc Self-hosted Piston trên Render/Docker Free     │
└────────────────────────────────────────────────────────┘
```

---

## 2. BƯỚC 1: THIẾT LẬP SUPABASE (DATABASE, AUTH & STORAGE)

1. Truy cập [https://supabase.com](https://supabase.com) và đăng ký tài khoản miễn phí (bằng GitHub).
2. Nhấn **New Project**:
   - **Name**: `hsg-judge`
   - **Database Password**: Đặt mật khẩu mạnh (lưu lại mật khẩu này).
   - **Region**: `Southeast Asia (Singapore)` để có độ trễ thấp nhất cho Việt Nam.
3. Sau khi project khởi tạo xong:
   - Vào **Project Settings** -> **Database**:
     - Lấy **Connection string (URI)** -> chọn chế độ **Transaction / Session pooler** cho `DATABASE_URL`.
     - Lấy Direct Connection string cho `DIRECT_URL`.
   - Vào **Project Settings** -> **API**:
     - Lấy `Project URL` (`SUPABASE_URL`)
     - Lấy `anon key` (`SUPABASE_ANON_KEY`)
     - Lấy `service_role key` (`SUPABASE_SERVICE_ROLE_KEY` - bí mật).
4. Tạo Storage Bucket:
   - Vào mục **Storage** ở menu trái -> **New Bucket**.
   - **Bucket name**: `problem-pdfs`
   - Bật **Public bucket** = `ON` (để học sinh đọc được PDF đề bài).

---

## 3. BƯỚC 2: KHỞI TẠO DATABASE SCHEMA & NẠP DỮ LIỆU MẪU

Trên máy local hoặc qua terminal:

```bash
cd backend

# 1. Tạo file .env với thông tin Supabase vừa lấy
# Điền DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 2. Chạy Migration đẩy Schema lên Supabase
npx prisma db push

# 3. Seed dữ liệu mặc định (15 chủ đề thuật toán + user mẫu)
npm run prisma:seed

# 4. Nạp bài tập từ thư mục Data/
# Cách 1: Chạy trực tiếp từ script
npx ts-node src/ingestion/test-ingest.ts "../Data"
```

---

## 4. BƯỚC 3: CẤU HÌNH ENGINE CHẤM CODE (JUDGE0 CE / PISTON)

### Lựa chọn 1: Judge0 CE qua RapidAPI (Khuyên dùng)
1. Đăng ký tại [RapidAPI - Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce).
2. Nhấn **Subscribe to Test** -> chọn gói **BASIC (Free)**.
3. Lấy `X-RapidAPI-Key` của bạn.
4. Cấu hình vào Backend:
   ```env
   JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
   JUDGE0_API_KEY="your-rapidapi-key"
   ```

### Lựa chọn 2: Self-hosted Piston trên Render/Docker
Nếu lớp học có số lượng nộp bài lớn (>1000 submits/ngày), bạn có thể deploy Piston Docker image miễn phí lên Render (Web Service Docker) hoặc máy chủ trường học.

---

## 5. BƯỚC 4: DEPLOY BACKEND LÊN RENDER / KOYEB

### Cách deploy lên Render.com (Free):
1. Đẩy code lên repository GitHub cá nhân (hoặc tổ chức trường).
2. Đăng nhập [https://render.com](https://render.com) -> **New Web Service**.
3. Kết nối repo GitHub của bạn -> chọn thư mục con `backend` (**Root Directory** = `backend`).
4. Cấu hình Build & Start:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm run start:prod`
5. Thêm các **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=postgresql://... (lấy từ Supabase)
   DIRECT_URL=postgresql://... (lấy từ Supabase)
   SUPABASE_URL=https://...supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_STORAGE_BUCKET=problem-pdfs
   JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=...
   ```
6. Nhấn **Create Web Service**. Sau khi deploy xong, bạn sẽ có URL backend: `https://hsg-judge-backend.onrender.com`.

---

## 6. BƯỚC 5: DEPLOY FRONTEND LÊN VERCEL

1. Đăng nhập [https://vercel.com](https://vercel.com) (bằng GitHub).
2. Nhấn **Add New...** -> **Project** -> Chọn repo chứa code.
3. Thiết lập:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
4. Cấu hình **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://hsg-judge-backend.onrender.com/api
   ```
5. Nhấn **Deploy**.
6. Sau ~1 phút, trang web của bạn sẽ hoạt động tại địa chỉ: `https://hsg-judge.vercel.app`.

---

## 7. TỔNG HỢP FILE MẪU BIẾN MÔI TRƯỜNG (.ENV)

### Backend `.env`:
```env
# Database
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase Auth & Storage
SUPABASE_URL="https://[YOUR_REF].supabase.co"
SUPABASE_ANON_KEY="eyJhbG..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."
SUPABASE_STORAGE_BUCKET="problem-pdfs"

# Execution Engine
JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
JUDGE0_API_KEY="your-rapidapi-key"

# Limits & Port
PORT=4000
NODE_ENV=production
DATA_DIR="../Data"
DEFAULT_TIME_LIMIT_MS=1000
DEFAULT_MEMORY_LIMIT_MB=256
```

### Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
# Khi lên production thay bằng:
# NEXT_PUBLIC_API_URL="https://hsg-judge-backend.onrender.com/api"
```
