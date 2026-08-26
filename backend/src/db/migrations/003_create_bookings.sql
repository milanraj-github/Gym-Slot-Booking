CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    slot_id UUID NOT NULL REFERENCES gym_slots(id),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at TIMESTAMPTZ
);
