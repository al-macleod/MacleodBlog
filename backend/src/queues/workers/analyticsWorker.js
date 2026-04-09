const { Worker } = require('bullmq');
const Post = require('../../models/Post');
const { getRedisConnection } = require('../connection');
const { enqueueEmail } = require('../jobs/emailJobs');

const getDateRange = (period) => {
  const now = new Date();
  const start = new Date(now);

  if (period === 'daily') {
    start.setDate(start.getDate() - 1);
  } else {
    start.setDate(start.getDate() - 7);
  }

  return { start, end: now };
};

const gatherStats = async (period) => {
  const { start, end } = getDateRange(period);

  const [totals] = await Post.aggregate([
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalComments: { $sum: '$commentsCount' }
      }
    }
  ]);

  const newPosts = await Post.countDocuments({
    isPublished: true,
    createdAt: { $gte: start, $lte: end }
  });

  return {
    period,
    start: start.toISOString(),
    end: end.toISOString(),
    stats: {
      totalPosts: totals ? totals.totalPosts : 0,
      totalViews: totals ? totals.totalViews : 0,
      totalLikes: totals ? totals.totalLikes : 0,
      totalComments: totals ? totals.totalComments : 0,
      newPosts
    }
  };
};

const processAnalyticsJob = async (job) => {
  const period = job.data.period || 'daily';
  const adminEmail = process.env.ADMIN_DIGEST_EMAIL || process.env.SMTP_USER;

  if (!adminEmail) {
    console.warn('Analytics worker: no admin email configured, skipping digest');
    return;
  }

  const result = await gatherStats(period);
  console.log(`Analytics worker: gathered ${period} stats`, result.stats);

  await enqueueEmail('analytics-digest', {
    to: adminEmail,
    period,
    stats: result.stats
  });
};

const createAnalyticsWorker = () => new Worker('analytics', processAnalyticsJob, {
  connection: getRedisConnection(),
  concurrency: 1
});

module.exports = { createAnalyticsWorker };
