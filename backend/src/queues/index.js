const { Queue } = require('bullmq');
const { getRedisConnection } = require('./connection');

const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  }
};

let queues = null;

const getQueues = () => {
  if (!queues) {
    const connection = getRedisConnection();
    queues = {
      email: new Queue('email', { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
      media: new Queue('media', { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
      sitemap: new Queue('sitemap', { connection, defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 2 } }),
      analytics: new Queue('analytics', { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
      backup: new Queue('backup', { connection, defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 2 } })
    };
  }

  return queues;
};

const closeQueues = async () => {
  if (queues) {
    await Promise.all(Object.values(queues).map((q) => q.close()));
    queues = null;
  }
};

module.exports = { getQueues, closeQueues };
