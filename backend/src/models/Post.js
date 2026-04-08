const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true
  },
  authorId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    default: ''
  },
  seoTitle: {
    type: String,
    default: ''
  },
  seoDescription: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['tweet', 'article'],
    default: 'tweet'
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video']
    },
    url: String,
    alt: String
  }],
  hashtags: [String],
  interests: [String], // tags matching user interests
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  reposts: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  commentsCount: {
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
  isPublished: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Post', postSchema);
