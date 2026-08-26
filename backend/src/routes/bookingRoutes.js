const express = require('express');
const { createBooking, cancelBooking, getMyBookings } = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const bookingRateLimiter = require('../middleware/bookingRateLimiter');
const validate = require('../middleware/validate');
const { createBookingSchema, cancelBookingSchema } = require('../utils/validationSchemas');

const router = express.Router();

router.get('/', authMiddleware, getMyBookings);
router.post('/', authMiddleware, validate(createBookingSchema), bookingRateLimiter, createBooking);
router.delete('/:id', authMiddleware, validate(cancelBookingSchema), cancelBooking);

module.exports = router;
