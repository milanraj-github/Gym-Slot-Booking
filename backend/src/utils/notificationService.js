const Notification = require('../models/mongo/notification');

const sendBookingCreatedNotification = async ({ userId, channel = 'email' }) => {
  const message = 'Your gym slot booking was confirmed.';
  try {
    await Notification.create({
      userId,
      channel,
      message,
      sentAt: new Date(),
      status: 'sent'
    });
  } catch (error) {
    console.warn(`Booking created notification failed for user ${userId}:`, error.message);
    try {
      await Notification.create({
        userId,
        channel,
        message,
        sentAt: new Date(),
        status: 'failed'
      });
    } catch (innerError) {
      // Best-effort: ignore if MongoDB is completely unreachable
    }
  }
};

const sendBookingCancelledNotification = async ({ userId, channel = 'email' }) => {
  const message = 'Your gym slot booking was cancelled.';
  try {
    await Notification.create({
      userId,
      channel,
      message,
      sentAt: new Date(),
      status: 'sent'
    });
  } catch (error) {
    console.warn(`Booking cancelled notification failed for user ${userId}:`, error.message);
    try {
      await Notification.create({
        userId,
        channel,
        message,
        sentAt: new Date(),
        status: 'failed'
      });
    } catch (innerError) {
      // Best-effort: ignore if MongoDB is completely unreachable
    }
  }
};

module.exports = {
  sendBookingCreatedNotification,
  sendBookingCancelledNotification
};
