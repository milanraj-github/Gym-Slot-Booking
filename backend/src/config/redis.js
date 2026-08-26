const Redis = require('ioredis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined.');
}

const redis = new Redis(redisUrl, {
  lazyConnect: true
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
});

module.exports = redis;
