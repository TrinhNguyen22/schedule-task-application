# Schedule Task Application

Ứng dụng nội bộ cho phép tạo và chạy các tác vụ theo lịch (schedule), sử dụng
PostgreSQL (Neon), Redis (Upstash), Express, TypeScript, Prisma và BullMQ.

## Yêu cầu

- Node.js >= 20
- Tài khoản [Neon](https://neon.tech) (PostgreSQL)
- Tài khoản [Upstash](https://upstash.com) (Redis)
- Docker (tùy chọn, cho `docker compose`)

## Cài đặt local

```bash
# 1. Clone và cài dependencies
npm install

# 2. Cấu hình môi trường
cp .env.example .env
# Điền DATABASE_URL (Neon) và REDIS_URL (Upstash) vào .env
# Xem hướng dẫn chi tiết: docs/setup-neon-upstash.md

# 3. Khởi tạo database
npx prisma generate
npx prisma db push

# 4. Chạy API + Worker (2 terminal)
npm run dev          # Terminal 1 - API :3000
npm run dev:worker   # Terminal 2 - Worker
```

## Docker Compose

```bash
cp .env.example .env
# Cập nhật DATABASE_URL và REDIS_URL trỏ tới Neon/Upstash

docker compose up --build
```

Compose chạy 2 service `api` và `worker`. Database và Redis dùng cloud qua biến môi trường.

## API Endpoints


| Method | Path                        | Mô tả                                          |
| ------ | --------------------------- | ---------------------------------------------- |
| GET    | `/health`                   | Liveness check                                 |
| GET    | `/ready`                    | Readiness (DB + Redis)                         |
| POST   | `/api/schedules`            | Tạo schedule                                   |
| POST   | `/api/schedules/push`       | Push từ hệ thống ngoài (cần `idempotency-key`) |
| GET    | `/api/schedules`            | Danh sách (pagination, filter)                 |
| GET    | `/api/schedules/:id`        | Chi tiết + runs                                |
| PATCH  | `/api/schedules/:id/cancel` | Hủy task chưa chạy                             |
| PATCH  | `/api/schedules/:id/pause`  | Tạm dừng cron schedule                         |
| PATCH  | `/api/schedules/:id/resume` | Tiếp tục cron schedule                         |
| GET    | `/api/docs`                 | Swagger UI                                     |


## Ví dụ request (GMT+7)

### Tạo Email task one-shot

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: demo-001" \
  -d '{
    "type": "EMAIL",
    "scheduleAt": "2026-06-14T08:00:00+07:00",
    "payload": {
      "to": ["abc@example.com"],
      "subject": "Daily report",
      "body": "Báo cáo tự động"
    }
  }'
```

### Push với idempotency

```bash
curl -X POST http://localhost:3000/api/schedules/push \
  -H "Content-Type: application/json" \
  -H "idempotency-key: push-unique-key-001" \
  -d '{
    "type": "FILE_READ",
    "scheduleAt": "2026-06-14T08:05:00+07:00",
    "payload": { "path": "sample.txt" }
  }'
```

### File Import

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "type": "FILE_IMPORT",
    "scheduleAt": "2026-06-14T08:10:00+07:00",
    "payload": {
      "paths": ["sample.csv", "sample.json"],
      "format": "csv"
    }
  }'
```

### Cron task (08:00 hàng ngày, giờ VN)

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "type": "FORM_FILL",
    "cronExpr": "0 8 * * *",
    "timezone": "Asia/Ho_Chi_Minh",
    "payload": {
      "template": { "greeting": "Hello {{name}}" },
      "data": { "name": "Team" }
    }
  }'
```

## Chạy test

```bash
# Tất cả tests (unit + integration mock)
npm test

# Chỉ unit tests
npm run test:unit

# Integration (mock service, không cần DB thật)
npm run test:integration
```

## Cấu hình Email

Mặc định `EMAIL_MODE=mock` — ghi log, không gửi SMTP thật.

Để bật SMTP:

```env
EMAIL_MODE=smtp
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM=noreply@internal.local
```

## File tasks

File chỉ đọc từ thư mục `FILE_TASK_BASE_PATH` (mặc định `./data`). Sample files có sẵn trong `data/`.

## Kiến trúc

Xem [docs/architecture.md](docs/architecture.md).

## Setup Neon + Upstash (chi tiết)

Xem [docs/setup-neon-upstash.md](docs/setup-neon-upstash.md) — hướng dẫn từng bước,
verify kết nối, smoke test, và troubleshooting.

## Smoke test end-to-end

```bash
# Chỉ cần .env có DATABASE_URL + REDIS_URL thật (Neon + Upstash)
npm run test:smoke
```

Script tự set `SMOKE_TEST=true` và load `.env`. Không cần chạy `dev:worker` riêng
— smoke test tự spawn worker in-process.

## API Collection

Xem [docs/api-collection/requests.http](docs/api-collection/requests.http).

## Test report

```bash
npm test              # 17 passed (unit + integration)
npm run test:smoke    # e2e với Neon/Upstash (cần SMOKE_TEST=true)
```