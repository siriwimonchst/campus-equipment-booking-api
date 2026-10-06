import fs from 'node:fs'

const BASE_URL = 'https://campus-equipment-booking-api.siriwimonchst.workers.dev/api'

async function run() {
  const cases = []
  let createdBookingId = null
  let secondBookingId = null

  async function request(name, method, path, body = null, expectedStatus = 200) {
    const url = `${BASE_URL}${path}`
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    if (body) {
      options.body = JSON.stringify(body)
    }

    const res = await fetch(url, options)
    const status = res.status
    let data = null
    const text = await res.text()
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    const record = {
      name,
      method,
      url,
      requestBody: body,
      status,
      expectedStatus,
      passed: status === expectedStatus,
      responseBody: data
    }
    cases.push(record)
    return { status, data }
  }

  // Cleanup existing bookings for clean test run
  try {
    const listRes = await fetch(`${BASE_URL}/bookings`)
    if (listRes.ok) {
      const existing = await listRes.json()
      for (const b of existing) {
        await fetch(`${BASE_URL}/bookings/${b.id}`, { method: 'DELETE' })
      }
    }
  } catch (e) {
    console.warn('Initial cleanup skipped:', e.message)
  }

  // 1. List Equipment
  await request('Case 1: List all equipment', 'GET', '/equipment', null, 200)

  // 2. Create Booking (Success)
  const create1 = await request(
    'Case 2: Create a booking (Success)',
    'POST',
    '/bookings',
    {
      equipmentId: 'eq-1',
      borrowerName: 'Somchai Jaidee',
      startAt: '2026-10-20T09:00:00.000Z',
      endAt: '2026-10-20T11:00:00.000Z',
      purpose: 'Class presentation'
    },
    201
  )
  if (create1.data && create1.data.id) {
    createdBookingId = create1.data.id
  }

  // 3. Create Booking Overlap (Conflict 409)
  await request(
    'Case 3: Create booking with overlapping time (Conflict)',
    'POST',
    '/bookings',
    {
      equipmentId: 'eq-1',
      borrowerName: 'Somsak Rakเรียน',
      startAt: '2026-10-20T10:00:00.000Z',
      endAt: '2026-10-20T12:00:00.000Z',
      purpose: 'Club meeting'
    },
    409
  )

  // 4. Create Booking Invalid Dates (Bad Request 400)
  await request(
    'Case 4: Create booking with startAt after endAt (Validation Error)',
    'POST',
    '/bookings',
    {
      equipmentId: 'eq-1',
      borrowerName: 'Somchai Jaidee',
      startAt: '2026-10-20T13:00:00.000Z',
      endAt: '2026-10-20T11:00:00.000Z',
      purpose: 'Time travel experiment'
    },
    400
  )

  // 5. Create Booking Unknown Equipment (Bad Request 400)
  await request(
    'Case 5: Create booking with non-existent equipmentId (Bad Request)',
    'POST',
    '/bookings',
    {
      equipmentId: 'eq-999',
      borrowerName: 'Somchai Jaidee',
      startAt: '2026-10-21T09:00:00.000Z',
      endAt: '2026-10-21T11:00:00.000Z',
      purpose: 'Guest lecture'
    },
    400
  )

  // 6. Create a second non-overlapping booking
  const create2 = await request(
    'Case 6: Create second non-overlapping booking for eq-1 (Success)',
    'POST',
    '/bookings',
    {
      equipmentId: 'eq-1',
      borrowerName: 'Mana Dee',
      startAt: '2026-10-20T14:00:00.000Z',
      endAt: '2026-10-20T16:00:00.000Z',
      purpose: 'Study group'
    },
    201
  )
  if (create2.data && create2.data.id) {
    secondBookingId = create2.data.id
  }

  // 7. List Bookings (Success)
  await request('Case 7: List all bookings', 'GET', '/bookings', null, 200)

  // 8. Get Single Booking (Success)
  if (createdBookingId) {
    await request(`Case 8: Get booking by ID (${createdBookingId})`, 'GET', `/bookings/${createdBookingId}`, null, 200)
  }

  // 9. Get Single Booking Not Found (404)
  await request('Case 9: Get booking with non-existent ID (Not Found)', 'GET', '/bookings/non-existent-id', null, 404)

  // 10. Patch Booking (Success)
  if (createdBookingId) {
    await request(
      `Case 10: Update booking purpose (Success)`,
      'PATCH',
      `/bookings/${createdBookingId}`,
      { purpose: 'Updated presentation topic' },
      200
    )
  }

  // 11. Patch Booking with Conflict (409)
  if (secondBookingId) {
    await request(
      `Case 11: Update booking time to conflict with another booking (Conflict)`,
      'PATCH',
      `/bookings/${secondBookingId}`,
      {
        startAt: '2026-10-20T09:30:00.000Z',
        endAt: '2026-10-20T10:30:00.000Z'
      },
      409
    )
  }

  // 12. Delete Booking (Success 204)
  if (createdBookingId) {
    await request(`Case 12: Delete booking by ID (Success)`, 'DELETE', `/bookings/${createdBookingId}`, null, 204)
  }

  // 13. Verify Deletion (404)
  if (createdBookingId) {
    await request(`Case 13: Get deleted booking (Not Found)`, 'GET', `/bookings/${createdBookingId}`, null, 404)
  }

  // Generate TEST_EVIDENCE.md
  let doc = `# Test Evidence Report\n\n`
  doc += `**Base API URL**: \`${BASE_URL}\`  \n`
  doc += `**Test Date**: ${new Date().toISOString()}  \n`
  doc += `**Total Test Cases**: ${cases.length}  \n`
  doc += `**Passed**: ${cases.filter(c => c.passed).length} / ${cases.length}\n\n`
  doc += `## Summary of Test Results\n\n`
  doc += `| # | Test Case | Method | Path | Expected | Actual | Result |\n`
  doc += `|---|-----------|--------|------|----------|--------|--------|\n`
  cases.forEach((c, idx) => {
    const path = c.url.replace(BASE_URL, '')
    doc += `| ${idx + 1} | ${c.name} | \`${c.method}\` | \`${path}\` | \`${c.expectedStatus}\` | \`${c.status}\` | ${c.passed ? '✅ PASS' : '❌ FAIL'} |\n`
  })

  doc += `\n## Detailed Test Cases & Raw HTTP Evidence\n\n`
  cases.forEach((c, idx) => {
    doc += `### ${idx + 1}. ${c.name}\n`
    doc += `**Request:**\n`
    doc += `\`\`\`http\n${c.method} ${c.url}\nContent-Type: application/json\n\n${c.requestBody ? JSON.stringify(c.requestBody, null, 2) : '(no body)'}\n\`\`\`\n\n`
    doc += `**Response (HTTP ${c.status}):**\n`
    doc += `\`\`\`json\n${c.responseBody !== null ? JSON.stringify(c.responseBody, null, 2) : '(empty body - 204 No Content)'}\n\`\`\`\n\n`
    doc += `---\n\n`
  })

  fs.writeFileSync('TEST_EVIDENCE.md', doc)
  console.log(`Generated TEST_EVIDENCE.md with ${cases.length} test cases. All passed: ${cases.every(c => c.passed)}`)
}

run().catch(console.error)
