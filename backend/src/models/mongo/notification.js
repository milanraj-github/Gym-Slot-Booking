const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true
    },
    channel: {
      type: String,
      required: true,
      enum: ['email', 'push']
    },
    message: {
      type: String,
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      required: true,
      enum: ['sent', 'failed']
    }
  },
  {
    collection: 'notification_history'
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
