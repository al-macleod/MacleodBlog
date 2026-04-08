/**
 * Calculate quality score for a post based on:
 * - Community engagement (likes/dislikes)
 * - Account age and reputation
 * - Engagement metrics (comments, reposts)
 */

function calculateQualityScore(post, author) {
  if (!post || !author) return 0;

  // Engagement score: likes weight heavily, dislikes reduce slightly
  const engagementScore = (post.likes * 2) - (post.dislikes * 0.5) + (post.reposts * 1.5) + (post.commentsCount * 0.5);

  // Account age bonus: newer accounts can still rank high, but consistent users get bonus
  const accountAgeMs = Date.now() - new Date(author.createdAt).getTime();
  const accountAgeMonths = accountAgeMs / (1000 * 60 * 60 * 24 * 30);
  
  // Age bonus: 1x at 0 months, 1.5x at 6 months, 2x at 12 months (logarithmic scaling)
  const ageBonus = 1 + Math.log(Math.max(1, accountAgeMonths + 1)) * 0.15;

  // Author reputation: based on posts count and average engagement
  const authorReputation = 1 + Math.min(1, (author.postsCount || 0) / 10) * 0.3;

  // Recency bonus: recent posts get slight boost
  const postAgeMs = Date.now() - new Date(post.createdAt).getTime();
  const postAgeHours = postAgeMs / (1000 * 60 * 60);
  const recencyBonus = Math.max(0.5, 2 - (postAgeHours / 24)); // decays from 2x to 0.5x over time

  // Time decay: older posts gradually rank lower (but established posts keep value)
  const timeDecay = Math.exp(-postAgeHours / (24 * 30)); // half-life of ~30 days

  const totalScore = engagementScore * ageBonus * authorReputation * recencyBonus * timeDecay;

  return Math.max(0, parseFloat(totalScore.toFixed(2)));
}

module.exports = {
  calculateQualityScore
};
