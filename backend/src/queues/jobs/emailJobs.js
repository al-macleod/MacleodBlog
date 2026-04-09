const { getQueues } = require('../index');

/**
 * Enqueue an email notification job.
 *
 * Supported job names:
 *   - 'new-comment'  : notify post author about a new comment
 *   - 'mention'      : notify a user who was @mentioned
 *   - 'new-follower' : notify a user about a new follower
 *   - 'analytics-digest' : send analytics report to admin
 *
 * @param {string} jobName
 * @param {object} data
 * @param {object} [opts]  extra BullMQ job options
 */
const enqueueEmail = async (jobName, data, opts = {}) => {
  try {
    const { email } = getQueues();
    await email.add(jobName, data, opts);
  } catch (err) {
    console.error(`Failed to enqueue email job "${jobName}":`, err.message);
  }
};

module.exports = { enqueueEmail };
