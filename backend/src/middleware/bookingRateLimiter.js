const redis = require('../config/redis');

const bookingRateLimiter = async (req, res, next) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const key = `ratelimit:booking:${userId}`;
  const LIMIT = 10;
  const WINDOW_SECONDS = 60;

  try {
    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (currentCount > LIMIT) {
      let ttl = await redis.ttl(key);
      if (ttl < 0) ttl = WINDOW_SECONDS;

      res.set('Retry-After', String(ttl));
      return res.status(429).json({
        message: 'Too many booking attempts. Please try again later.'
      });
    }

    next();
  } catch (error) {
    console.warn('Booking rate limiter Redis error (failing open):', error.message);
    next();
  }
};

module.exports = bookingRateLimiter;
