const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'dislike', 'repost'],
    default: 'like'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index to prevent duplicate likes from same IP
likeSchema.index({ postId: 1, ipAddress: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
