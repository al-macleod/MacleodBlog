const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { enqueueEmail } = require('../queues/jobs/emailJobs');

// Get comments for a post
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const comments = await Comment.find({ postId, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Comment.countDocuments({ postId, isApproved: true });

    res.json({
      comments,
      total,
      hasMore: skip + comments.length < total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPendingComments = async (req, res) => {
  try {
    const comments = await Comment.find({ isApproved: false }).sort({ createdAt: 1 });
    const postIds = [...new Set(comments.map((comment) => comment.postId))];
    const posts = await Post.find({ id: { $in: postIds } }).select('id title slug');
    const postMap = new Map(posts.map((post) => [post.id, post]));

    res.json({
      comments: comments.map((comment) => ({
        ...comment.toObject(),
        postTitle: postMap.get(comment.postId)?.title || 'Deleted post',
        postSlug: postMap.get(comment.postId)?.slug || comment.postId
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create comment
exports.createComment = async (req, res) => {
  try {
    const { postId, author, email, content } = req.body;

    // Verify post exists
    const post = await Post.findOne({ id: postId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const newComment = new Comment({
      id: uuidv4(),
      postId,
      author: author || 'Anonymous',
      email,
      content,
      isApproved: false // Moderation required
    });

    await newComment.save();

    // Increment comment count on post
    post.commentsCount += 1;
    await post.save();

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve comment (admin only)
exports.approveComment = async (req, res) => {
  try {
    const comment = await Comment.findOneAndUpdate(
      { id: req.params.id },
      { isApproved: true, updatedAt: new Date() },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Notify the post author about the newly approved comment
    const post = await Post.findOne({ id: comment.postId }).select('id title slug authorId');
    if (post) {
      const author = await User.findOne({ id: post.authorId }).select('email firstName lastName');
      if (author && author.email) {
        await enqueueEmail('new-comment', {
          to: author.email,
          postAuthorName: `${author.firstName} ${author.lastName}`.trim(),
          commenterName: comment.author || 'Anonymous',
          postTitle: post.title,
          postSlug: post.slug,
          commentContent: comment.content.slice(0, 300)
        });
      }
    }

    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ id: req.params.id });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    await Comment.findOneAndDelete({ id: req.params.id });

    // Decrement comment count on post
    const post = await Post.findOne({ id: comment.postId });
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
