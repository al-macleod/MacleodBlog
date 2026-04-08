const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true
  },
  postId: {
    type: String,
    required: true,
    index: true
  },
  author: {
    type: String,
    default: 'Anonymous'
  },
  email: String,
  content: {
    type: String,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isApproved: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Comment', commentSchema);
