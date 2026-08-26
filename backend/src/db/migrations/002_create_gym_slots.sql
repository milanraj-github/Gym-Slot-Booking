CREATE TABLE IF NOT EXISTS gym_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity SMALLINT NOT NULL DEFAULT 10,
    booked_count SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_capacity_bounds
        CHECK (booked_count >= 0 AND booked_count <= capacity),

    CONSTRAINT uq_slot_window
        UNIQUE (slot_date, start_time, end_time)
);
