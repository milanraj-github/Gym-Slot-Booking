import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Calendar, Clock, CheckCircle2, AlertCircle, AlertTriangle, X, Trash2 } from 'lucide-react';
import { apiFetch } from '../api/client';

export function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmModalBookingId, setConfirmModalBookingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/bookings');
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message || 'Failed to load booking history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const openCancelModal = (bookingId) => {
    setConfirmModalBookingId(bookingId);
  };

  const closeCancelModal = () => {
    setConfirmModalBookingId(null);
  };

  const handleConfirmCancel = async () => {
    if (!confirmModalBookingId) return;
    const bookingId = confirmModalBookingId;
    closeCancelModal();

    setCancellingId(bookingId);
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });
      setSuccess(response.message || 'Booking cancelled successfully!');
      await fetchBookings();
    } catch (err) {
      if (err.status === 409) {
        setError('Booking is already cancelled.');
      } else if (err.status === 403) {
        setError('You are not authorized to cancel this booking.');
      } else {
        setError(err.message || 'Failed to cancel booking.');
      }
    } finally {
      setCancellingId(null);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    return new Date(dateTimeStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-group">
          <h1>
            <Ticket className="w-7 h-7 title-icon" />
            <span>My Bookings History</span>
          </h1>
          <p className="page-subtitle">View and manage your confirmed and cancelled gym slot reservations</p>
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
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            key="success-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="alert alert-success"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="bookings-list">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="skeleton-card" style={{ height: '110px' }} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card empty-state"
        >
          <div className="empty-icon-wrapper">
            <Ticket className="w-8 h-8" />
          </div>
          <h3>No bookings found</h3>
          <p className="text-muted">You haven't reserved any gym slots yet.</p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="bookings-list"
        >
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            const isCancellingThis = cancellingId === booking.id;

            return (
              <motion.div
                key={booking.id}
                variants={itemVariants}
                className={`glass-card booking-card ${booking.status}`}
              >
                <div className="booking-main">
                  <div className="booking-id-tag">
                    <span>Booking ID:</span>
                    <span className="booking-id-hash">#{booking.id.substring(0, 8)}</span>
                  </div>

                  <div className="booking-details-row">
                    <div className="detail-pill">
                      <Calendar className="w-4 h-4 detail-icon" />
                      <span>{formatDate(booking.slotDate)}</span>
                    </div>

                    <div className="detail-pill">
                      <Clock className="w-4 h-4 detail-icon" />
                      <span>
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </span>
                    </div>

                    <div className="detail-pill text-subtle" style={{ fontSize: '0.85rem' }}>
                      <span>Booked: {formatDateTime(booking.bookedAt)}</span>
                    </div>

                    {booking.cancelledAt && (
                      <div className="detail-pill text-danger" style={{ fontSize: '0.85rem' }}>
                        <span>Cancelled: {formatDateTime(booking.cancelledAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="booking-status-action">
                  <span className={`status-badge ${booking.status}`}>
                    {booking.status.toUpperCase()}
                  </span>

                  {isConfirmed ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => openCancelModal(booking.id)}
                      className="btn btn-danger btn-sm"
                      disabled={isCancellingThis}
                    >
                      {isCancellingThis ? (
                        <>
                          <div className="spinner w-3.5 h-3.5 border-2" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel Booking</span>
                        </>
                      )}
                    </motion.button>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Glass Confirmation Modal */}
      <AnimatePresence>
        {confirmModalBookingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={closeCancelModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="glass-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon-wrapper">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="modal-title">Confirm Cancellation</h3>
                <p className="modal-description">
                  Are you sure you want to cancel your gym slot booking? This action will immediately release your slot for other members.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeCancelModal}
                  className="btn btn-secondary btn-block"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="btn btn-danger btn-block"
                >
                  Yes, Cancel Booking
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
