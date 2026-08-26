const pool = require('../config/postgres');
const redis = require('../config/redis');
const ActivityLog = require('../models/mongo/activityLog');
const AppError = require('../utils/AppError');
const { sendBookingCreatedNotification, sendBookingCancelledNotification } = require('../utils/notificationService');

const createBooking = async (req, res, next) => {
  const { slotId } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const slotCheck = await client.query(
      `SELECT id, capacity, booked_count FROM gym_slots WHERE id = $1`,
      [slotId]
    );

    if (slotCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Slot not found', 404));
    }

    const existingBooking = await client.query(
      `SELECT id FROM bookings WHERE user_id = $1 AND slot_id = $2 AND status = 'confirmed'`,
      [userId, slotId]
    );

    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return next(new AppError('You already have a booking for this slot', 409));
    }

    const updateResult = await client.query(
      `UPDATE gym_slots
       SET booked_count = booked_count + 1
       WHERE id = $1
         AND booked_count < capacity
       RETURNING booked_count`,
      [slotId]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Slot is full', 409, 'SLOT_FULL'));
    }

    let bookingResult;
    try {
      bookingResult = await client.query(
        `INSERT INTO bookings (user_id, slot_id, status)
         VALUES ($1, $2, 'confirmed')
         RETURNING id, user_id, slot_id, status, booked_at`,
        [userId, slotId]
      );
    } catch (insertError) {
      if (insertError.code === '23505') {
        await client.query('ROLLBACK');
        return next(new AppError('You already have a booking for this slot', 409));
      }
      throw insertError;
    }

    await client.query('COMMIT');

    const newBooking = bookingResult.rows[0];

    try {
      await redis.del(`slot:${slotId}:available`);
    } catch (cacheErr) {
      console.warn('Redis cache invalidation error:', cacheErr.message);
    }

    try {
      await ActivityLog.create({
        userId,
        action: 'booking_created',
        slotId,
        metadata: {
          ip: req.ip || req.connection?.remoteAddress || '127.0.0.1',
          userAgent: req.get('user-agent') || 'unknown'
        }
      });
    } catch (logErr) {
      console.warn('MongoDB activity log error:', logErr.message);
    }

    try {
      await sendBookingCreatedNotification({ userId, slotId });
    } catch (notifErr) {
      console.warn('Notification service error:', notifErr.message);
    }

    return res.status(201).json({
      message: 'Booking successful',
      booking: {
        id: newBooking.id,
        userId: newBooking.user_id,
        slotId: newBooking.slot_id,
        status: newBooking.status,
        bookedAt: newBooking.booked_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
};

const cancelBooking = async (req, res, next) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT id, user_id, slot_id, status
       FROM bookings
       WHERE id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Booking not found', 404));
    }

    const booking = bookingResult.rows[0];

    if (booking.user_id !== userId) {
      await client.query('ROLLBACK');
      return next(new AppError('You are not authorized to cancel this booking', 403));
    }

    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return next(new AppError('Booking is already cancelled', 409));
    }

    if (booking.status !== 'confirmed') {
      await client.query('ROLLBACK');
      return next(new AppError(`Cannot cancel booking with status '${booking.status}'`, 409));
    }

    const slotId = booking.slot_id;

    const updateBookingRes = await client.query(
      `UPDATE bookings
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'confirmed'
       RETURNING id, user_id, slot_id, status, cancelled_at`,
      [bookingId, userId]
    );

    if (updateBookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Booking is already cancelled', 409));
    }

    const updateSlotRes = await client.query(
      `UPDATE gym_slots
       SET booked_count = booked_count - 1
       WHERE id = $1 AND booked_count > 0
       RETURNING booked_count`,
      [slotId]
    );

    if (updateSlotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Failed to update slot booked count', 500));
    }

    await client.query('COMMIT');

    try {
      await redis.del(`slot:${slotId}:available`);
    } catch (cacheErr) {
      console.warn('Redis cache invalidation error during cancellation:', cacheErr.message);
    }

    try {
      await ActivityLog.create({
        userId,
        action: 'booking_cancelled',
        slotId,
        metadata: {
          ip: req.ip || req.connection?.remoteAddress || '127.0.0.1',
          userAgent: req.get('user-agent') || 'unknown'
        }
      });
    } catch (logErr) {
      console.warn('MongoDB activity log error during cancellation:', logErr.message);
    }

    try {
      await sendBookingCancelledNotification({ userId, slotId });
    } catch (notifErr) {
      console.warn('Notification service error during cancellation:', notifErr.message);
    }

    return res.status(200).json({
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
         b.id,
         b.slot_id,
         s.slot_date,
         s.start_time,
         s.end_time,
         b.status,
         b.booked_at,
         b.cancelled_at
       FROM bookings b
       JOIN gym_slots s ON b.slot_id = s.id
       WHERE b.user_id = $1
       ORDER BY b.booked_at DESC`,
      [userId]
    );

    const bookings = result.rows.map((row) => {
      let formattedSlotDate = row.slot_date;
      if (row.slot_date) {
        if (typeof row.slot_date === 'string') {
          formattedSlotDate = row.slot_date.split('T')[0];
        } else if (row.slot_date instanceof Date) {
          const year = row.slot_date.getFullYear();
          const month = String(row.slot_date.getMonth() + 1).padStart(2, '0');
          const day = String(row.slot_date.getDate()).padStart(2, '0');
          formattedSlotDate = `${year}-${month}-${day}`;
        }
      }

      return {
        id: row.id,
        slotId: row.slot_id,
        slotDate: formattedSlotDate,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        bookedAt: row.booked_at,
        cancelledAt: row.cancelled_at || null
      };
    });

    return res.status(200).json({
      bookings
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createBooking,
  cancelBooking,
  getMyBookings
};
