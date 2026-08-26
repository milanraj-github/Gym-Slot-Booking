const pool = require('../config/postgres');

const seedSlots = async () => {
  const targetDate = process.env.SEED_DATE || '2026-08-27';

  const slots = [
    { start_time: '06:00:00', end_time: '07:00:00' },
    { start_time: '07:00:00', end_time: '08:00:00' },
    { start_time: '08:00:00', end_time: '09:00:00' },
    { start_time: '17:00:00', end_time: '18:00:00' },
    { start_time: '18:00:00', end_time: '19:00:00' }
  ];

  try {
    console.log(`Seeding gym slots for date: ${targetDate}...`);

    for (const slot of slots) {
      await pool.query(
        `INSERT INTO gym_slots (slot_date, start_time, end_time, capacity, booked_count)
         VALUES ($1, $2, $3, 10, 0)
         ON CONFLICT (slot_date, start_time, end_time) DO NOTHING`,
        [targetDate, slot.start_time, slot.end_time]
      );
    }

    console.log('Slots seeded successfully.');
  } catch (error) {
    console.error('Error seeding slots:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  seedSlots();
}

module.exports = seedSlots;
