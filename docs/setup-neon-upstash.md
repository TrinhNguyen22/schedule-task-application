# Hướng dẫn Setup Neon + Upstash

Tài liệu này hướng dẫn từng bước cấu hình PostgreSQL trên **Neon** và Redis trên **Upstash**
để chạy Schedule Task Application trên máy Windows local.

---

## Tổng quan


| Service    | Provider                       | Dùng cho                           |
| ---------- | ------------------------------ | ---------------------------------- |
| PostgreSQL | [Neon](https://neon.tech)      | Lưu Schedule, TaskRun, Idempotency |
| Redis      | [Upstash](https://upstash.com) | BullMQ queue / scheduler           |


Bạn **không cần** cài Postgres hay Redis trên máy. Chỉ cần Node.js và kết nối internet.

---

## Bước 1 — Tạo Neon PostgreSQL

### 1.1 Đăng ký & tạo project

1. Truy cập [https://neon.tech](https://neon.tech) và đăng ký (GitHub/Google).
2. **New Project** → đặt tên ví dụ `schedule-task-dev`.
3. Chọn region gần VN nhất (ví dụ `Singapore` / `ap-southeast-1`).
4. PostgreSQL version: **16** (mặc định OK).

### 1.2 Lấy Connection String

1. Vào project → tab **Dashboard** hoặc **Connection Details**.
2. Copy **Connection string** dạng:

```
postgresql://neondb_owner:xxxxxxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

1. Dán vào `.env`:

```env
DATABASE_URL=postgresql://neondb_owner:xxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> **Lưu ý:** Luôn giữ `?sslmode=require` ở cuối URL.

### 1.3 Khởi tạo schema

```powershell
cd "C:\Users\trinhnguyentt5\Documents\FullStack NodeJS\schedule-task-application"
npx prisma generate
npx prisma db push
```

Kết quả mong đợi:

```
Your database is now in sync with your Prisma schema.
```

Kiểm tra trên Neon Console → **Tables** → thấy `Schedule`, `TaskRun`, `IdempotencyRecord`.

---

## Bước 2 — Tạo Upstash Redis

### 2.1 Tạo database

1. Truy cập [https://upstash.com](https://upstash.com) và đăng ký.
2. **Create Database** → chọn **Redis**.
3. Type: **Regional** (free tier đủ cho dev).
4. Region: gần VN (ví dụ `ap-southeast-1`).
5. Bật **TLS** (mặc định bật trên Upstash).

### 2.2 Lấy Redis URL

1. Vào database vừa tạo → tab **Details**.
2. Copy **Redis URL** dạng:

```
rediss://default:AYxxxxxxxx@us1-xxxx.upstash.io:6379
```

1. Dán vào `.env`:

```env
REDIS_URL=rediss://default:AYxxxx@us1-xxxx.upstash.io:6379
```

> **Quan trọng:** URL phải bắt đầu bằng `rediss://` (có chữ **s** = TLS).
> Ứng dụng tự bật TLS khi detect `rediss://`.

---

## Bước 3 — File `.env` hoàn chỉnh

```env
PORT=3000
NODE_ENV=development
TZ=Asia/Ho_Chi_Minh

DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
REDIS_URL=rediss://default:...@....upstash.io:6379

SCHEDULE_DEFAULT_MAX_RETRIES=3
SCHEDULE_DEFAULT_TIMEOUT_MS=30000
IDEMPOTENCY_TTL_HOURS=24

FILE_TASK_BASE_PATH=./data
EMAIL_MODE=mock
```

Sao chép từ template:

```powershell
cp .env.example .env
# Sau đó sửa DATABASE_URL và REDIS_URL
```

---

## Bước 4 — Verify kết nối (không cần chạy server)

```powershell
npm run verify:setup
```

Script kiểm tra:

- `DATABASE_URL` hợp lệ → `SELECT 1` trên Neon
- `REDIS_URL` hợp lệ → `PING` trên Upstash
- Bảng Prisma đã tồn tại

Kết quả PASS:

```
✔ PostgreSQL connected
✔ Redis connected (PONG)
✔ Prisma tables exist
Setup verification PASSED
```

---

## Bước 5 — Chạy ứng dụng

Mở **2 terminal** trong thư mục project:

**Terminal 1 — API**

```powershell
npm run dev
```

**Terminal 2 — Worker**

```powershell
npm run dev:worker
```

Log mong đợi:

```
API server started  port=3000
Worker ready        queue=schedule-execute
```

### Kiểm tra health

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

`/ready` trả `200` với `"database": true, "redis": true` → kết nối cloud OK.

---

## Bước 6 — Smoke test end-to-end

### Cách 1: Tự động (khuyến nghị — 1 lệnh)

```powershell
npm run test:smoke
```

Script tự set `SMOKE_TEST=true` và đọc `.env`. Không cần gõ biến môi trường thủ công.

Test sẽ:

1. Tạo FILE_READ task (delay 3 giây)
2. Chờ worker xử lý → `COMPLETED`
3. Test push idempotency (2 lần cùng key → cùng schedule)
4. Test cancel task chưa chạy

### Cách 2: Manual qua curl

```powershell
# Tạo task đọc file sau 5 giây (GMT+7)
$scheduleAt = (Get-Date).AddSeconds(5).ToString("yyyy-MM-ddTHH:mm:ss+07:00")

curl -X POST http://localhost:3000/api/schedules `
  -H "Content-Type: application/json" `
  -H "x-correlation-id: manual-smoke-001" `
  -d "{`"type`":`"FILE_READ`",`"scheduleAt`":`"$scheduleAt`",`"payload`":{`"path`":`"sample.txt`"}}"

# Lấy id từ response, đợi 10 giây, rồi:
curl http://localhost:3000/api/schedules/<SCHEDULE_ID>
# status phải là COMPLETED, runs[0].status = SUCCESS
```

---

## Bước 7 — Test Report (deliverable)

```powershell
npm test          # Unit + integration → chụp màn hình
npm run test:smoke  # Smoke e2e (cần .env thật) → chụp màn hình
```

---

## Troubleshooting

### `P1001: Can't reach database server`

- Kiểm tra `DATABASE_URL` đúng, có `sslmode=require`.
- Neon project có đang **Active** (không bị suspend do idle free tier).

### `Redis connection ETIMEDOUT` / `MaxRetriesPerRequestError`

**Nguyên nhân phổ biến nhất:** copy nhầm URL dạng `redis://` thay vì `rediss://`.

Upstash **bắt buộc TLS**. Trong Upstash Console → database → **Connect** → chọn tab
**Redis** → copy URL bắt đầu bằng `rediss://`:

```env
# ✘ SAI — không có TLS
REDIS_URL=redis://default:TOKEN@xxx.upstash.io:6379

# ✔ ĐÚNG — có chữ "s" = TLS
REDIS_URL=rediss://default:TOKEN@xxx.upstash.io:6379
```

> Ứng dụng sẽ **tự sửa** `redis://` → `rediss://` nếu host là `*.upstash.io`,
> nhưng bạn vẫn nên sửa `.env` cho đúng.

**Các bước kiểm tra:**

1. Vào Upstash → database → **Details** → copy lại **Redis URL** (không phải REST URL).
2. Đảm bảo username là `default` và password là token đầy đủ (không thiếu ký tự).
3. Không có khoảng trắng hoặc dấu ngoặc kép thừa trong `.env`.
4. Chạy lại:

```powershell
npm run verify:setup
```

### `Redis connection ETIMEDOUT` / `ECONNREFUSED` (khác)

- Dùng `rediss://` không phải `redis://`.
- Copy lại password từ Upstash (không có khoảng trắng thừa).
- Firewall công ty có thể chặn port 6379 — thử mạng khác hoặc hotspot.

### `/ready` trả 503

- Một trong hai service chưa kết nối được.
- Chạy `npm run verify:setup` để xác định DB hay Redis lỗi.

### Task stuck ở `SCHEDULED`, không `COMPLETED`

- **Worker chưa chạy** — phải có `npm run dev:worker` ở terminal riêng.
- `scheduleAt` đã qua nhưng worker mới start → tạo task mới với delay 5–10 giây.

### `prisma db push` lỗi permission

- Dùng connection string của user `neondb_owner` (owner role).

### BullMQ repeatable job không chạy đúng giờ VN

- Đảm bảo `timezone: "Asia/Ho_Chi_Minh"` trong request cron.
- Worker và API cùng `TZ=Asia/Ho_Chi_Minh` trong `.env`.

---

## Tài liệu liên quan

- [README.md](../README.md) — tổng quan project
- [architecture.md](./architecture.md) — kiến trúc
- [requests.http](./api-collection/requests.http) — API collection

