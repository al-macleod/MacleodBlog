const Like = require('../models/Like');
const Post = require('../models/Post');

// Get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.socket.remoteAddress ||
         'unknown';
};

const toggleReaction = async (req, res, reactionType, postField, responseFlag, responseCountField) => {
  const { postId } = req.params;
  const ip = getClientIp(req);

  const post = await Post.findOne({ id: postId });
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const existingReaction = await Like.findOne({ postId, ipAddress: ip, type: reactionType });

  if (existingReaction) {
    await Like.deleteOne({ _id: existingReaction._id });
    post[postField] = Math.max(0, (post[postField] || 0) - 1);
    await post.save();
    return res.json({ [responseFlag]: false, [responseCountField]: post[postField] });
  }

  const newReaction = new Like({
    postId,
    ipAddress: ip,
    type: reactionType
  });
  await newReaction.save();
  post[postField] = (post[postField] || 0) + 1;
  await post.save();
  return res.json({ [responseFlag]: true, [responseCountField]: post[postField] });
};

// Toggle like
exports.toggleLike = async (req, res) => {
  try {
    return await toggleReaction(req, res, 'like', 'likes', 'liked', 'likes');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle dislike
exports.toggleDislike = async (req, res) => {
  try {
    return await toggleReaction(req, res, 'dislike', 'dislikes', 'disliked', 'dislikes');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle repost
exports.toggleRepost = async (req, res) => {
  try {
    return await toggleReaction(req, res, 'repost', 'reposts', 'reposted', 'reposts');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check if user liked/reposted
exports.checkStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const ip = getClientIp(req);

    const liked = await Like.findOne({ postId, ipAddress: ip, type: 'like' });
    const disliked = await Like.findOne({ postId, ipAddress: ip, type: 'dislike' });
    const reposted = await Like.findOne({ postId, ipAddress: ip, type: 'repost' });

    res.json({
      liked: !!liked,
      disliked: !!disliked,
      reposted: !!reposted
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
