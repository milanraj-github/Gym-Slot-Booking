const pool = require('../config/postgres');
const redis = require('../config/redis');

const getSlots = async (req, res, next) => {
  try {
    const { date } = req.query;

    const pgResult = await pool.query(
      `SELECT id, slot_date, start_time, end_time, capacity, booked_count
       FROM gym_slots
       WHERE slot_date = $1
       ORDER BY start_time ASC`,
      [date]
    );

    if (pgResult.rows.length === 0) {
      return res.status(200).json({
        date,
        slots: []
      });
    }

    const slots = await Promise.all(
      pgResult.rows.map(async (row) => {
        const cacheKey = `slot:${row.id}:available`;
        let availableCapacity = null;

        try {
          const cachedValue = await redis.get(cacheKey);
          if (cachedValue !== null && cachedValue !== undefined) {
            availableCapacity = parseInt(cachedValue, 10);
          }
        } catch (cacheErr) {
          console.warn(`Redis cache read failed for key ${cacheKey}:`, cacheErr.message);
        }

        if (availableCapacity === null || isNaN(availableCapacity)) {
          availableCapacity = row.capacity - row.booked_count;

          try {
            await redis.set(cacheKey, availableCapacity.toString(), 'EX', 10);
          } catch (cacheErr) {
            console.warn(`Redis cache write failed for key ${cacheKey}:`, cacheErr.message);
          }
        }

        let formattedDate = date;
        if (row.slot_date) {
          if (typeof row.slot_date === 'string') {
            formattedDate = row.slot_date.split('T')[0];
          } else if (row.slot_date instanceof Date) {
            const year = row.slot_date.getFullYear();
            const month = String(row.slot_date.getMonth() + 1).padStart(2, '0');
            const day = String(row.slot_date.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
          }
        }

        return {
          id: row.id,
          date: formattedDate,
          startTime: row.start_time,
          endTime: row.end_time,
          capacity: row.capacity,
          bookedCount: row.booked_count,
          available: availableCapacity
        };
      })
    );

    return res.status(200).json({
      date,
      slots
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSlots
};
