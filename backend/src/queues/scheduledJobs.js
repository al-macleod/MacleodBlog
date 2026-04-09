const { getQueues } = require('./index');

/**
 * Register all recurring BullMQ job schedulers.
 * Uses upsertJobScheduler so re-starts are idempotent.
 */
const registerScheduledJobs = async () => {
  const { analytics, backup } = getQueues();

  // Daily analytics digest — 8:00 AM UTC every day
  await analytics.upsertJobScheduler(
    'daily-analytics-digest',
    { pattern: '0 8 * * *' },
    { name: 'daily-digest', data: { period: 'daily' } }
  );

  // Weekly analytics digest — 8:00 AM UTC every Monday
  await analytics.upsertJobScheduler(
    'weekly-analytics-digest',
    { pattern: '0 8 * * 1' },
    { name: 'weekly-digest', data: { period: 'weekly' } }
  );

  // Daily MongoDB backup — 2:00 AM UTC every day
  await backup.upsertJobScheduler(
    'daily-backup',
    { pattern: '0 2 * * *' },
    { name: 'backup', data: { destination: process.env.BACKUP_DESTINATION || 'local' } }
  );

  console.log('Scheduled jobs registered: daily/weekly analytics digest, daily backup');
};

module.exports = { registerScheduledJobs };
