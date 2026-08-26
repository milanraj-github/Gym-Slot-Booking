CREATE UNIQUE INDEX IF NOT EXISTS uq_active_booking_per_user_slot
    ON bookings (user_id, slot_id)
    WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_slots_date
    ON gym_slots (slot_date);

CREATE INDEX IF NOT EXISTS idx_bookings_user_status
    ON bookings (user_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_slot_status
    ON bookings (slot_id, status);
