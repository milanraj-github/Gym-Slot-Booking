import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

export function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
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

  const handleCancel = async (bookingId) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmCancel) return;

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Bookings History</h1>
          <p className="page-subtitle">View and manage your confirmed and cancelled gym slot reservations</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your booking history...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎟️</span>
          <h3>No bookings found</h3>
          <p>You haven't made any gym slot bookings yet.</p>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            const isCancellingThis = cancellingId === booking.id;

            return (
              <div key={booking.id} className={`booking-card ${booking.status}`}>
                <div className="booking-main">
                  <div className="booking-id-tag">
                    <span className="id-label">Booking ID:</span> #{booking.id.substring(0, 8)}
                  </div>
                  <div className="booking-details">
                    <div className="detail-item">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">{formatDate(booking.slotDate)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Booked At:</span>
                      <span className="detail-value">{formatDateTime(booking.bookedAt)}</span>
                    </div>
                    {booking.cancelledAt && (
                      <div className="detail-item text-danger">
                        <span className="detail-label">Cancelled At:</span>
                        <span className="detail-value">{formatDateTime(booking.cancelledAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="booking-status-action">
                  <span className={`status-badge ${booking.status}`}>
                    {booking.status.toUpperCase()}
                  </span>

                  {isConfirmed ? (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="btn btn-danger btn-sm"
                      disabled={isCancellingThis}
                    >
                      {isCancellingThis ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  ) : (
                    <span className="cancelled-label">Cancelled</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
