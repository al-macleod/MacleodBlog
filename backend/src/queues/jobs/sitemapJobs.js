const { getQueues } = require('../index');

/**
 * Enqueue a sitemap regeneration job.
 * Deduplicated by jobId so rapid post bursts collapse into one rebuild.
 */
const enqueueSitemapRegeneration = async () => {
  try {
    const { sitemap } = getQueues();
    await sitemap.add('regenerate', {}, {
      jobId: 'sitemap-regenerate',
      delay: 5000 // 5-second debounce window
    });
  } catch (err) {
    console.error('Failed to enqueue sitemap regeneration job:', err.message);
  }
};

module.exports = { enqueueSitemapRegeneration };
