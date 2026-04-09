const { default: IORedis } = require('ioredis');

let connection = null;

const getRedisConnection = () => {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false
    });

    connection.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
    });

    connection.on('connect', () => {
      console.log('Redis connected');
    });
  }

  return connection;
};

const closeRedisConnection = async () => {
  if (connection) {
    try {
      await connection.quit();
    } catch (_) {
      connection.disconnect();
    }
    connection = null;
  }
};

module.exports = { getRedisConnection, closeRedisConnection };
