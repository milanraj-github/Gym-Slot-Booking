import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

export function SlotsPage() {
  const [selectedDate, setSelectedDate] = useState('2026-08-27');
  const [slots, setSlots] = useState([]);
  const [userBookedSlotIds, setUserBookedSlotIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSlotsAndBookings = useCallback(async (date) => {
    setLoading(true);
    setError('');
    try {
      // Fetch available slots for date
      const slotsData = await apiFetch(`/api/slots?date=${date}`);
      setSlots(slotsData.slots || []);

      // Fetch user's active bookings to know which slots user already booked
      try {
        const bookingsData = await apiFetch('/api/bookings');
        const activeIds = new Set(
          (bookingsData.bookings || [])
            .filter((b) => b.status === 'confirmed')
            .map((b) => b.slotId)
        );
        setUserBookedSlotIds(activeIds);
      } catch (bErr) {
        console.warn('Could not fetch active user bookings:', bErr.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to load slots');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlotsAndBookings(selectedDate);
  }, [selectedDate, fetchSlotsAndBookings]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSuccess('');
    setError('');
  };

  const handleBook = async (slotId) => {
    setBookingSlotId(slotId);
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch('/api/bookings', {
        method: 'POST',
        body: { slotId }
      });

      setSuccess(response.message || 'Booking successful!');
      // Refresh slots and user active bookings
      await fetchSlotsAndBookings(selectedDate);
    } catch (err) {
      if (err.status === 429) {
        setError('Too many booking attempts. Please try again later.');
      } else if (err.code === 'SLOT_FULL') {
        setError('This gym slot is already full.');
      } else {
        setError(err.message || 'Failed to book slot');
      }
    } finally {
      setBookingSlotId(null);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Gym Available Slots</h1>
          <p className="page-subtitle">Select a date to view remaining capacity and book your slot</p>
        </div>

        <div className="date-picker-container">
          <label htmlFor="slot-date">Select Date:</label>
          <input
            type="date"
            id="slot-date"
            className="date-input"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading slots for {selectedDate}...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <h3>No slots available for this date</h3>
          <p>Try selecting another date such as 2026-08-27.</p>
        </div>
      ) : (
        <div className="slots-grid">
          {slots.map((slot) => {
            const isFull = slot.available === 0;
            const isAlreadyBooked = userBookedSlotIds.has(slot.id);
            const isBookingThis = bookingSlotId === slot.id;
            const isButtonDisabled = isFull || isAlreadyBooked || isBookingThis;

            return (
              <div key={slot.id} className={`slot-card ${isFull ? 'full' : ''} ${isAlreadyBooked ? 'booked' : ''}`}>
                <div className="slot-time">
                  <span className="time-icon">⏰</span>
                  <span className="time-text">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                </div>

                <div className="slot-stats">
                  <div className="stat-item">
                    <span className="stat-label">Capacity</span>
                    <span className="stat-value">{slot.capacity}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Booked</span>
                    <span className="stat-value">{slot.bookedCount}</span>
                  </div>
                  <div className="stat-item highlight">
                    <span className="stat-label">Available</span>
                    <span className={`stat-value ${slot.available > 0 ? 'text-success' : 'text-danger'}`}>
                      {slot.available}
                    </span>
                  </div>
                </div>

                <div className="slot-action">
                  <button
                    onClick={() => handleBook(slot.id)}
                    className={`btn btn-block ${isAlreadyBooked ? 'btn-secondary' : isFull ? 'btn-disabled' : 'btn-primary'}`}
                    disabled={isButtonDisabled}
                  >
                    {isBookingThis
                      ? 'Booking...'
                      : isAlreadyBooked
                      ? 'Already Booked'
                      : isFull
                      ? 'Full'
                      : 'Book Slot'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
