const { getQueues } = require('../index');

/**
 * Enqueue a media optimization job for an uploaded file.
 *
 * @param {object} data
 * @param {string} data.filePath   absolute path to the uploaded file
 * @param {string} data.filename   filename (used to derive output paths)
 * @param {string} data.mimeType   MIME type of the uploaded file
 * @param {string} data.postId     id of the parent post (for DB update)
 */
const enqueueMediaOptimization = async (data) => {
  try {
    const { media } = getQueues();
    await media.add('optimize-image', data);
  } catch (err) {
    console.error('Failed to enqueue media optimization job:', err.message);
  }
};

module.exports = { enqueueMediaOptimization };
