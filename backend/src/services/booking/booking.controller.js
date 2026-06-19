const db = require('../../config/db');

/**
 * Dynamically computes open 1-hour appointment slots for a specific calendar date.
 */
exports.getAvailableSlots = async (req, res, next) => {
  const { salonId, date } = req.query; // Expected Format: YYYY-MM-DD

  if (!salonId || !date) {
    return res.status(400).json({ error: 'Missing required query parameters: salonId and date.' });
  }

  try {
    // 1. Pull the operating timeline bounds for the specified salon
    const salonRes = await db.query(
      'SELECT operating_hours_open, operating_hours_close FROM salons WHERE id = $1',
      [salonId]
    );
    
    if (!salonRes.rows[0]) {
      return res.status(404).json({ error: 'The requested salon profile does not exist.' });
    }
    
    const { operating_hours_open, operating_hours_close } = salonRes.rows[0];

    // 2. Fetch all active or processing bookings for that day
    const bookingRes = await db.query(
      `SELECT appointment_start, appointment_end FROM bookings 
       WHERE salon_id = $1 AND status IN ('confirmed', 'pending') 
       AND appointment_start::date = $2::date`,
      [salonId, date]
    );
    const confirmedBookings = bookingRes.rows;

    // 3. Build time windows across the salon's open shift hours
    const availableSlots = [];
    let currentSlotStart = new Date(`${date}T${operating_hours_open}`);
    const operationalClosing = new Date(`${date}T${operating_hours_close}`);

    // Increment through the workday in 30-minute intervals to offer flexible booking choices
    while (currentSlotStart < operationalClosing) {
      let currentSlotEnd = new Date(currentSlotStart.getTime() + 60 * 60 * 1000); // 1-hour treatment duration default
      
      if (currentSlotEnd > operationalClosing) break;

      // Check if this window conflicts with any booked times in the database
      const isOverlapping = confirmedBookings.some(booking => {
        const bookedStart = new Date(booking.appointment_start);
        const bookedEnd = new Date(booking.appointment_end);
        return (currentSlotStart < bookedEnd && currentSlotEnd > bookedStart);
      });

      availableSlots.push({
        startTime: currentSlotStart.toISOString(),
        endTime: currentSlotEnd.toISOString(),
        isAvailable: !isOverlapping
      });

      // Advance our generator window step forward
      currentSlotStart = new Date(currentSlotStart.getTime() + 30 * 60 * 1000);
    }

    res.status(200).json({
      salonId,
      date,
      slots: availableSlots
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handles transactional checkout with concurrency guards to protect against race conditions.
 */
exports.createBooking = async (req, res, next) => {
  const { salonId, startTime, endTime, totalPrice } = req.body;
  const customerId = req.user.id; // Pulled straight from verified JWT middleware payload

  if (!salonId || !startTime || !endTime || !totalPrice) {
    return res.status(400).json({ error: 'Missing required fields in transaction payload.' });
  }

  // Request an isolated checkout client wrapper to manage our execution block manually
  const { client, query, release } = await db.getTransaction();

  try {
    // Open the critical atomic boundary block
    await query('BEGIN');

    // CONCURRENCY GUARD: Acquire an exclusive row lock across existing overlapping ranges for this salon
    const conflictCheck = await query(
      `SELECT id FROM bookings 
       WHERE salon_id = $1 AND status IN ('confirmed', 'pending')
       AND (appointment_start < $3 AND appointment_end > $2) FOR UPDATE`, 
      [salonId, startTime, endTime]
    );

    // If another thread committed a checkout record right before us, abort immediately
    if (conflictCheck.rows.length > 0) {
      await query('ROLLBACK');
      release(); // Return client to pool
      return res.status(409).json({ 
        error: 'Slot conflict detected. This specific time window was secured by another client. Please refresh availability.' 
      });
    }

    // Secure the appointment slot
    const newBooking = await query(
      `INSERT INTO bookings (customer_id, salon_id, appointment_start, appointment_end, total_price, status)
       VALUES ($1, $2, $3, $4, $5, 'confirmed') 
       RETURNING id, appointment_start, appointment_end, status, total_price`,
      [customerId, salonId, startTime, endTime, totalPrice]
    );

    // Everything is clean, commit writes safely
    await query('COMMIT');
    release();

    res.status(201).json({
      message: 'Your appointment has been locked and confirmed successfully!',
      booking: newBooking.rows[0]
    });
  } catch (err) {
    // If anything fails in the try block, revert all temporary writes to keep the DB consistent
    await query('ROLLBACK');
    release();
    next(err);
  }
};