# Campus Equipment Booking API

This is a Hono + Cloudflare Workers D1 implementation for the Campus Equipment Booking API.

## Requirements
- Node.js
- npm
- Wrangler CLI (installed as a devDependency)

## Getting Started

1. Install dependencies:
```sh
npm install
```

2. Initialize the local D1 database:
```sh
npm run db:init
```

3. Start the development server:
```sh
npm run dev
```

## 🌐 Base API URLs
- **Production (Live Cloudflare Workers)**: `https://campus-equipment-booking-api.siriwimonchst.workers.dev/api`
- **Local Development**: `http://localhost:8787/api`

## 📁 Required Submission Documents

- 📄 **[API Contract & ERD](file:///d:/Midterm-LabTest/campus-equipment-booking-API/API_CONTRACT.md)**: Full API specification, data schema, and HTTP status code justifications (400, 404, 409).
- 🧪 **[Test Evidence Report](file:///d:/Midterm-LabTest/campus-equipment-booking-API/TEST_EVIDENCE.md)**: Live verification of 13 test cases covering CRUD, validation errors, conflict (409), and not found (404).
- 🤖 **[AI Usage Log](file:///d:/Midterm-LabTest/campus-equipment-booking-API/AI_LOG.md)**: Transparent record of prompts, adopted outputs, and student verification.
- 🛡️ **[Quality Gate Review](file:///d:/Midterm-LabTest/campus-equipment-booking-API/QUALITY_GATE_REVIEW.md)**: 4 detailed findings, fixes, and evidence (Reliability & You Own It).

## API Contract

| Method | Path | Success | Purpose |
| ------ | ---- | ------- | ------- |
| GET | `/api/equipment` | 200 | List equipment |
| GET | `/api/bookings` | 200 | List bookings |
| GET | `/api/bookings/:id` | 200 | Get one booking |
| POST | `/api/bookings` | 201 | Create a booking |
| PATCH | `/api/bookings/:id` | 200 | Update a booking |
| DELETE | `/api/bookings/:id` | 204 | Delete a booking |

### Error Format
All errors return JSON in this format:
```json
{ "error": "A message understandable to a user or developer" }
```

### Schema / ERD
- **equipment**: `id` (PK), `name`, `location`
- **bookings**: `id` (PK), `equipmentId` (FK), `borrowerName`, `startAt`, `endAt`, `purpose`

## Test Cases (curl)

**1. Create a booking (Success)**
```sh
curl -X POST http://localhost:8787/api/bookings -H "Content-Type: application/json" -d "{\"equipmentId\":\"eq-1\",\"borrowerName\":\"Somchai\",\"startAt\":\"2026-10-20T09:00:00.000Z\",\"endAt\":\"2026-10-20T11:00:00.000Z\",\"purpose\":\"Class presentation\"}"
```

**2. Create a booking (Conflict)**
```sh
curl -X POST http://localhost:8787/api/bookings -H "Content-Type: application/json" -d "{\"equipmentId\":\"eq-1\",\"borrowerName\":\"Somchai\",\"startAt\":\"2026-10-20T10:00:00.000Z\",\"endAt\":\"2026-10-20T12:00:00.000Z\",\"purpose\":\"Another presentation\"}"
```
(Returns 409 Equipment is already booked during this time)

**3. Update a booking (Success)**
```sh
curl -X PATCH http://localhost:8787/api/bookings/<ID> -H "Content-Type: application/json" -d "{\"purpose\":\"Updated presentation\"}"
```

**4. Update a booking (Not Found)**
```sh
curl -X PATCH http://localhost:8787/api/bookings/invalid-id -H "Content-Type: application/json" -d "{\"purpose\":\"Updated presentation\"}"
```
(Returns 404 Booking not found)

**5. Delete a booking (Success)**
```sh
curl -X DELETE http://localhost:8787/api/bookings/<ID>
```
