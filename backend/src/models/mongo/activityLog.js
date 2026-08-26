const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      enum: ['booking_created', 'booking_cancelled']
    },
    slotId: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    collection: 'activity_logs'
  }
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
