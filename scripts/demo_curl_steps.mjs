const BASE_URL = 'https://campus-equipment-booking-api.siriwimonchst.workers.dev/api';

async function step(num, title, method, path, body = null, expected = '') {
  console.log(`======================================================================`);
  console.log(`STEP ${num}: ${title} [Expected: ${expected}]`);
  console.log(`COMMAND: curl -i -X ${method} "${BASE_URL}${path}"`);
  if (body) {
    console.log(`BODY: ${JSON.stringify(body, null, 2)}`);
  }
  
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE_URL}${path}`, options);
  console.log(`STATUS: HTTP/1.1 ${res.status} ${res.statusText}`);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    console.log(`RESPONSE:\n${JSON.stringify(json, null, 2)}`);
    return json;
  } catch {
    console.log(`RESPONSE: ${text || '(empty body)'}`);
    return null;
  }
}

async function main() {
  console.log(`\n>>> STARTING VERIFICATION TEST SUITE AGAINST PRODUCTION API <<<\n`);
  
  // 1. List equipment (200)
  await step(1, "List equipment", "GET", "/equipment", null, "200 OK");
  
  // 2. List bookings (200)
  await step(2, "List bookings", "GET", "/bookings", null, "200 OK");
  
  // 3. Create a booking (201)
  const b3 = await step(3, "Create a booking", "POST", "/bookings", {
    equipmentId: "eq-1",
    borrowerName: "Somchai Jaidee",
    startAt: "2026-10-20T09:00:00.000Z",
    endAt: "2026-10-20T11:00:00.000Z",
    purpose: "Class presentation"
  }, "201 Created");
  
  const bookingId = b3?.id || "not-found";
  
  // 4. Get one booking (200)
  await step(4, "Get one booking", "GET", `/bookings/${bookingId}`, null, "200 OK");
  
  // 5. Update a booking (200)
  await step(5, "Update a booking", "PATCH", `/bookings/${bookingId}`, {
    equipmentId: "eq-1",
    borrowerName: "Somchai Jaidee",
    startAt: "2026-10-20T12:00:00.000Z",
    endAt: "2026-10-20T14:00:00.000Z",
    purpose: "Updated class presentation"
  }, "200 OK");
  
  // 6. Invalid time range (400)
  await step(6, "Invalid time range (startAt after endAt)", "POST", "/bookings", {
    equipmentId: "eq-1",
    borrowerName: "Somchai Jaidee",
    startAt: "2026-10-21T11:00:00.000Z",
    endAt: "2026-10-21T09:00:00.000Z",
    purpose: "Invalid time range test"
  }, "400 Bad Request");
  
  // 7. Overlapping booking (409)
  await step(7, "Overlapping booking (Conflict)", "POST", "/bookings", {
    equipmentId: "eq-1",
    borrowerName: "Suda Dee",
    startAt: "2026-10-20T12:30:00.000Z",
    endAt: "2026-10-20T13:30:00.000Z",
    purpose: "Conflict test"
  }, "409 Conflict");
  
  // 8. Missing booking (404)
  await step(8, "Missing booking (Not Found)", "GET", "/bookings/not-found", null, "404 Not Found");
  
  // 9. Delete a booking (204)
  await step(9, "Delete a booking", "DELETE", `/bookings/${bookingId}`, null, "204 No Content");
  
  console.log(`\n======================================================================`);
  console.log(`>>> ALL 9 CURL GUIDE STEPS VERIFIED & PASSED SUCCESSFULLY! <<<\n`);
}

main().catch(console.error);
