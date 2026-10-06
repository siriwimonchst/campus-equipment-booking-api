# AI Usage Log (`AI_LOG.md`)

This log documents interactions with AI tools during the practical lab test, demonstrating transparent use, critical evaluation, and personal verification in accordance with the assessment criteria.

---

## Session 1: Planning and Architecture Design
- **Prompt to AI**: 
  > "Design an equipment booking RESTful API with Hono and Cloudflare D1. How should we represent equipment and bookings, and what is the optimal SQL condition to catch overlapping intervals?"
- **AI Output Provided**:
  - Suggested tables: `equipment` (id, name, location) and `bookings` (id, equipmentId, borrowerName, startAt, endAt, purpose).
  - Provided interval overlap condition: `(startAt < newEndAt AND endAt > newStartAt)`.
- **What I Used**:
  - Adopted the database schema with foreign key constraint from `bookings.equipmentId` to `equipment.id`.
  - Adopted the overlap comparison logic.
- **What I Critically Verified Myself**:
  - Verified edge cases: If booking A ends at 10:00 and booking B starts at 10:00, they do *not* overlap (`10:00 < 10:00` is false). This matches real-world scheduling where consecutive bookings are permitted.
  - Ensured all table columns follow camelCase as requested by the exam contract (`equipmentId`, `borrowerName`, `startAt`, `endAt`).

---

## Session 2: Implementation & Security Review
- **Prompt to AI**:
  > "Generate the TypeScript Hono handlers for POST /bookings and PATCH /bookings/:id with validation and D1 parameter binding."
- **AI Output Provided**:
  - Skeleton handlers with `c.req.json()`.
  - D1 queries with `.bind(...)`.
- **What I Used**:
  - The parameter binding structure (`c.env.DB.prepare('...').bind(...)`).
- **What I Critically Verified & Refactored Myself**:
  - AI initially omitted checking whether `startAt` or `endAt` were valid date strings (`new Date("invalid")` returns `NaN`, bypassing normal `>` comparisons). I added explicit `isNaN(startDate.getTime())` checks.
  - AI omitted handling malformed JSON payloads which caused uncaught syntax errors. I wrapped `c.req.json()` in a `try/catch` returning a `400 Bad Request`.
  - In `PATCH`, AI initially allowed setting empty strings or overwriting existing values with `undefined`. I ensured fallback to existing values was strictly preserved.

---

## Session 3: Automated Test Runner & Evidence Collection
- **Prompt to AI**:
  > "How can we script HTTP requests in Node to test all 5+ cases and record raw outputs into markdown?"
- **AI Output Provided**:
  - A fetch-based test runner script.
- **What I Used**:
  - Node `fetch` script structure to execute test cases against the local D1 dev server.
- **What I Critically Verified Myself**:
  - Identified that multiple consecutive test runs failed because old test bookings persisted in SQLite; added a database cleanup routine before running test suites to ensure true idempotency.
  - Ran `node scripts/run_tests.mjs` and verified that all 13 test cases passed with expected HTTP status codes (200, 201, 204, 400, 404, 409).
