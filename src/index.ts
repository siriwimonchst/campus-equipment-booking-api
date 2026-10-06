import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

app.notFound((c) => {
  return c.json({ error: 'Endpoint or resource not found' }, 404)
})

app.onError((err, c) => {
  return c.json({ error: err.message || 'Internal Server Error' }, 500)
})

// Helper function for unique IDs
function generateId() {
  return crypto.randomUUID()
}

app.get('/equipment', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM equipment').all()
  return c.json(results)
})

app.get('/bookings', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM bookings').all()
  return c.json(results)
})

app.get('/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const booking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first()
  
  if (!booking) {
    return c.json({ error: 'Booking not found' }, 404)
  }
  
  return c.json(booking)
})

app.post('/bookings', async (c) => {
  let body: any
  try {
    body = await c.req.json()
  } catch (err) {
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  const { equipmentId, borrowerName, startAt, endAt, purpose } = body

  if (!equipmentId || !borrowerName || !startAt || !endAt || !purpose) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return c.json({ error: 'Invalid date format for startAt or endAt' }, 400)
  }

  if (startDate >= endDate) {
    return c.json({ error: 'startAt must be before endAt' }, 400)
  }

  const equipment = await c.env.DB.prepare('SELECT * FROM equipment WHERE id = ?').bind(equipmentId).first()
  if (!equipment) {
    return c.json({ error: 'Equipment not found' }, 400)
  }

  // Check overlap
  const conflict = await c.env.DB.prepare(`
    SELECT * FROM bookings 
    WHERE equipmentId = ? 
    AND (
      (startAt < ? AND endAt > ?)
    )
  `).bind(equipmentId, endAt, startAt).first()

  if (conflict) {
    return c.json({ error: 'Equipment is already booked during this time' }, 409)
  }

  const id = generateId()
  await c.env.DB.prepare(`
    INSERT INTO bookings (id, equipmentId, borrowerName, startAt, endAt, purpose)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, equipmentId, borrowerName, startAt, endAt, purpose).run()

  const newBooking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first()
  return c.json(newBooking, 201)
})

app.patch('/bookings/:id', async (c) => {
  const id = c.req.param('id')
  let body: any
  try {
    body = await c.req.json()
  } catch (err) {
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  const { equipmentId, borrowerName, startAt, endAt, purpose } = body

  const booking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first<any>()
  if (!booking) {
    return c.json({ error: 'Booking not found' }, 404)
  }

  const newEquipmentId = equipmentId || booking.equipmentId
  const newStartAt = startAt || booking.startAt
  const newEndAt = endAt || booking.endAt

  const startDate = new Date(newStartAt)
  const endDate = new Date(newEndAt)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return c.json({ error: 'Invalid date format for startAt or endAt' }, 400)
  }

  if (startDate >= endDate) {
    return c.json({ error: 'startAt must be before endAt' }, 400)
  }

  if (equipmentId) {
    const equipment = await c.env.DB.prepare('SELECT * FROM equipment WHERE id = ?').bind(equipmentId).first()
    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 400)
    }
  }

  const conflict = await c.env.DB.prepare(`
    SELECT * FROM bookings 
    WHERE equipmentId = ? 
    AND id != ?
    AND (
      (startAt < ? AND endAt > ?)
    )
  `).bind(newEquipmentId, id, newEndAt, newStartAt).first()

  if (conflict) {
    return c.json({ error: 'Equipment is already booked during this time' }, 409)
  }

  await c.env.DB.prepare(`
    UPDATE bookings 
    SET equipmentId = ?, borrowerName = ?, startAt = ?, endAt = ?, purpose = ?
    WHERE id = ?
  `).bind(
    newEquipmentId, 
    borrowerName || booking.borrowerName, 
    newStartAt, 
    newEndAt, 
    purpose || booking.purpose, 
    id
  ).run()

  const updatedBooking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first()
  return c.json(updatedBooking, 200)
})

app.delete('/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const booking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first()
  
  if (!booking) {
    return c.json({ error: 'Booking not found' }, 404)
  }
  
  await c.env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run()
  return new Response(null, { status: 204 })
})

export default app
