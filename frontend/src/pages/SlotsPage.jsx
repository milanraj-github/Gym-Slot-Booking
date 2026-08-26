import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, CheckCircle2, AlertCircle, Sparkles, Check, Flame, X } from 'lucide-react';
import { apiFetch } from '../api/client';

export function SlotsPage() {
  const [selectedDate, setSelectedDate] = useState('2026-08-27');
  const [slots, setSlots] = useState([]);
  const [userBookedSlotIds, setUserBookedSlotIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-dismiss success banner after 3.5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-dismiss error banner after 4.5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchSlotsAndBookings = useCallback(async (date, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const slotsData = await apiFetch(`/api/slots?date=${date}`);
      setSlots(slotsData.slots || []);

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
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlotsAndBookings(selectedDate, true);
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

      // Optimistically update local slot counts immediately
      setSlots((prevSlots) =>
        prevSlots.map((s) =>
          s.id === slotId
            ? {
                ...s,
                bookedCount: s.bookedCount + 1,
                available: Math.max(0, s.available - 1)
              }
            : s
        )
      );
      setUserBookedSlotIds((prev) => new Set([...prev, slotId]));

      // Silent background sync
      await fetchSlotsAndBookings(selectedDate, false);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-group">
          <h1>
            <Sparkles className="w-7 h-7 title-icon" />
            <span>Gym Available Slots</span>
          </h1>
          <p className="page-subtitle">Select a date to view live remaining capacity and book your slot</p>
        </div>

        <div className="date-picker-card">
          <label htmlFor="slot-date">
            <Calendar className="w-4 h-4 text-emerald" />
            <span>Date:</span>
          </label>
          <input
            type="date"
            id="slot-date"
            className="date-input"
            min={(() => {
              const d = new Date();
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })()}
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="alert alert-error"
            style={{ justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', opacity: 0.8 }}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div
            key="success-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="alert alert-success"
            style={{ justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccess('')}
              style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', opacity: 0.8 }}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="slots-grid">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="skeleton-card" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card empty-state"
        >
          <div className="empty-icon-wrapper">
            <Calendar className="w-8 h-8" />
          </div>
          <h3>No slots available for this date</h3>
          <p className="text-muted">Try selecting another date such as 2026-08-27.</p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="slots-grid"
        >
          {slots.map((slot) => {
            const isFull = slot.available === 0;
            const isAlreadyBooked = userBookedSlotIds.has(slot.id);
            const isBookingThis = bookingSlotId === slot.id;
            const isButtonDisabled = isFull || isAlreadyBooked || isBookingThis;
            const capacityPercentage = Math.min(100, (slot.bookedCount / slot.capacity) * 100);

            return (
              <motion.div
                key={slot.id}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`glass-card slot-card ${isFull ? 'full' : ''} ${isAlreadyBooked ? 'booked' : ''}`}
              >
                <div className="slot-card-accent-bar" />

                <div className="slot-card-header">
                  <div className="slot-time-badge">
                    <Clock className="w-5 h-5 slot-time-icon" />
                    <span>
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                  </div>

                  {isAlreadyBooked ? (
                    <span className="status-badge confirmed">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : isFull ? (
                    <span className="status-badge cancelled">Full</span>
                  ) : slot.available <= 3 ? (
                    <span className="status-badge warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <Flame className="w-3.5 h-3.5" /> Filling Fast
                    </span>
                  ) : null}
                </div>

                <div className="slot-stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Capacity</span>
                    <span className="stat-value">{slot.capacity}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Booked</span>
                    <span className="stat-value">{slot.bookedCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Available</span>
                    <span
                      className={`stat-value ${
                        slot.available > 3
                          ? 'text-emerald'
                          : slot.available > 0
                          ? 'text-warning'
                          : 'text-danger'
                      }`}
                    >
                      {slot.available}
                    </span>
                  </div>
                </div>

                <div className="slot-capacity-bar-bg">
                  <div
                    className={`slot-capacity-bar-fill ${isFull ? 'full' : ''}`}
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>

                <div className="slot-action">
                  <motion.button
                    whileHover={!isButtonDisabled ? { scale: 1.02 } : {}}
                    whileTap={!isButtonDisabled ? { scale: 0.98 } : {}}
                    onClick={() => handleBook(slot.id)}
                    className={`btn btn-block ${
                      isAlreadyBooked
                        ? 'btn-secondary'
                        : isFull
                        ? 'btn-disabled'
                        : 'btn-primary'
                    }`}
                    disabled={isButtonDisabled}
                  >
                    {isBookingThis ? (
                      <>
                        <div className="spinner w-4 h-4 border-2" />
                        <span>Booking...</span>
                      </>
                    ) : isAlreadyBooked ? (
                      <>
                        <Check className="w-4 h-4 text-cyan" />
                        <span>Already Booked</span>
                      </>
                    ) : isFull ? (
                      <span>Slot Full</span>
                    ) : (
                      <span>Book Slot</span>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
