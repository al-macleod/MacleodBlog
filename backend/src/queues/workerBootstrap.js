const { createEmailWorker } = require('./workers/emailWorker');
const { createMediaWorker } = require('./workers/mediaWorker');
const { createSitemapWorker } = require('./workers/sitemapWorker');
const { createAnalyticsWorker } = require('./workers/analyticsWorker');
const { createBackupWorker } = require('./workers/backupWorker');
const { registerScheduledJobs } = require('./scheduledJobs');
const { closeQueues } = require('./index');
const { closeRedisConnection } = require('./connection');

let workers = [];

const attachWorkerLogging = (worker) => {
  worker.on('completed', (job) => {
    console.log(`[${worker.name}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${worker.name}] Job ${job ? job.id : 'unknown'} failed:`, err.message);
  });

  return worker;
};

/**
 * Start all queue workers and register scheduled jobs.
 * If Redis is unreachable, logs a warning and continues without workers.
 */
const startWorkers = async () => {
  try {
    workers = [
      attachWorkerLogging(createEmailWorker()),
      attachWorkerLogging(createMediaWorker()),
      attachWorkerLogging(createSitemapWorker()),
      attachWorkerLogging(createAnalyticsWorker()),
      attachWorkerLogging(createBackupWorker())
    ];

    await registerScheduledJobs();
    console.log('Background job workers started');
  } catch (err) {
    console.warn('Failed to start background job workers:', err.message);
    console.warn('The server will continue running without background jobs.');
  }
};

/**
 * Gracefully shut down all workers and close queue connections.
 */
const stopWorkers = async () => {
  if (workers.length === 0) return;

  await Promise.allSettled(workers.map((w) => w.close()));
  await closeQueues();
  await closeRedisConnection();
  workers = [];
  console.log('Background job workers stopped');
};

module.exports = { startWorkers, stopWorkers };
