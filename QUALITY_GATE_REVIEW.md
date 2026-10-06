# Quality Gate Review (`QUALITY_GATE_REVIEW.md`)

## Pre-30-Minute Snapshot
- **Git Commit / Version**: Initial commit / First working draft of schema and API endpoints.
- **Initial State**: Basic CRUD endpoints implemented in `src/index.ts`, basic table structure created in `schema.sql`.

---

## Quality Gate Findings & Improvements

### Finding 1: Date Format & NaN Validation Bypass (Reliability / Accuracy)
- **What I Found**:
  In the initial implementation, date checking was performed simply as:
  ```typescript
  if (new Date(startAt) >= new Date(endAt)) { ... }
  ```
  When invalid date strings (e.g. `"not-a-date"`) were submitted in the JSON body, `new Date("not-a-date").getTime()` evaluated to `NaN`. Because any comparison involving `NaN` evaluates to `false`, invalid dates bypassed validation and were stored directly into the database.
- **How I Fixed It**:
  Added explicit date parse validation checking `isNaN(startDate.getTime()) || isNaN(endDate.getTime())`. If invalid, immediately return HTTP `400 Bad Request` with `{ "error": "Invalid date format for startAt or endAt" }`.
- **Evidence**:
  Added test case in test suite (Case 4), verifying that invalid date formats are rejected with HTTP 400.

---

### Finding 2: Missing Entry-Point in Wrangler Configuration (Reliability / Accuracy)
- **What I Found**:
  Running `wrangler dev` failed with the error:
  `[ERROR] Missing entry-point to Worker script or to assets directory`.
  The original `wrangler.toml` file only specified the database binding without defining `main = "src/index.ts"`.
- **How I Fixed It**:
  Updated `wrangler.toml` to explicitly define `main = "src/index.ts"`.
- **Evidence**:
  `wrangler dev` successfully launched on `http://127.0.0.1:8787`, enabling full local execution and testing.

---

### Finding 3: Missing Variable Scope in PATCH Route Handler (Reasoning / You Own It)
- **What I Found**:
  During live test execution of `PATCH /bookings/:id`, the server returned an HTTP 500 internal server error with message: `"error": "id is not defined"`.
  Upon code review, an earlier edit had omitted `const id = c.req.param('id')` at the beginning of the handler.
- **How I Fixed It**:
  Added `const id = c.req.param('id')` back into the scope of the PATCH route handler before accessing the database.
- **Evidence**:
  Re-ran automated tests; Case 10 (`PATCH /bookings/:id`) succeeded with HTTP `200 OK` and returned the updated booking record.

---

### Finding 4: Inadvertent Time Conflict on Self During Partial Updates (Reasoning / You Own It)
- **What I Found**:
  When updating an existing booking without changing its time window (e.g. only updating `purpose`), the overlap check was matching the booking's *own* record, falsely reporting a conflict (HTTP 409).
- **How I Fixed It**:
  Modified the SQL query in the PATCH handler to explicitly exclude the current booking ID:
  ```sql
  SELECT * FROM bookings 
  WHERE equipmentId = ? 
    AND id != ?
    AND (startAt < ? AND endAt > ?)
  ```
- **Evidence**:
  Verified in Case 10 that updating only the `purpose` of an existing booking succeeds with HTTP 200 without triggering a false conflict.
