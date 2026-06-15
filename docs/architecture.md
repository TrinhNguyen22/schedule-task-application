# Kiến trúc hệ thống — Schedule Task Application

## Tổng quan

Hệ thống gồm 2 process độc lập:

- **API** (`src/index.ts`): Nhận HTTP request, validate, lưu DB, enqueue BullMQ.
- **Worker** (`src/worker.ts`): Consumer queue, thực thi task, ghi `TaskRun`, retry.

```
Client → API (Express) → Service → Repository → PostgreSQL (Neon)
                      ↘ QueueService → BullMQ → Redis (Upstash)
                                              ↘ Worker → Task Handlers
```

## Phân lớp (Layered Architecture)

| Layer | Thư mục | Trách nhiệm |
|-------|---------|-------------|
| Routes | `src/routes/` | Định nghĩa endpoint |
| Controllers | `src/controllers/` | HTTP I/O |
| Services | `src/services/` | Business logic |
| Repositories | `src/repositories/` | Prisma queries |
| Queue/Tasks | `src/queue/`, `src/tasks/` | Async execution |

## Luồng chính

### Tạo schedule

1. Validate body (Zod) + payload theo `TaskType`
2. Insert `Schedule` (PENDING)
3. Enqueue BullMQ: `delay` (one-shot) hoặc `repeat` (cron, TZ `Asia/Ho_Chi_Minh`)
4. Update status → SCHEDULED

### Idempotency (push)

1. Header `idempotency-key` bắt buộc
2. Check `IdempotencyRecord` → trả response cache
3. Check `Schedule.idempotencyKey` unique
4. Job ID cố định: `schedule-{id}` / `schedule-cron-{id}`

### Worker execution

1. Skip nếu CANCELLED / PAUSED
2. Tạo `TaskRun`, status RUNNING
3. Handler + timeout (`withTimeout`)
4. SUCCESS → COMPLETED (one-shot) hoặc SCHEDULED (cron)
5. FAIL → retry exponential; hết lượt → FAILED

## Task types

| Type | Handler | Output |
|------|---------|--------|
| FILE_READ | Đọc file trong `FILE_TASK_BASE_PATH` | metadata + preview |
| FILE_IMPORT | Parse CSV/JSON nhiều file | success/failed count |
| FORM_FILL | Điền `{{field}}` trong template | JSON output |
| EMAIL | Mock (default) hoặc SMTP | messageId, status |

## NFR

- **NFR01 Correlation ID**: Middleware `x-correlation-id` → logger → job data → TaskRun
- **NFR03 Error handling**: `AppError` + global handler, format `{ error: { code, message } }`
- **NFR04 Retry/Timeout**: BullMQ attempts + `withTimeout` per task
- **NFR05 Validation**: Zod schema per task type
- **NFR07 Docker**: `docker-compose.yml` (api + worker)
- **NFR08 API docs**: OpenAPI tại `/api/docs`

## Quyết định thiết kế (đã chốt)

- Email: mock mặc định, SMTP optional
- File: path only, chống path traversal
- Pause/Resume: chỉ cho cron
- Cancel RUNNING: trả 409
- Test: unit đầy đủ; integration mock service

## Môi trường

Local dev dùng Neon + Upstash qua `.env`, không cần cài Postgres/Redis trên máy.
