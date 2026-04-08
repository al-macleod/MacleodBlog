const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    default: uuidv4
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    trim: true
  },
  passwordHash: {
    type: String,
    default: null
  },
  resetPasswordTokenHash: {
    type: String,
    default: null,
    index: true
  },
  resetPasswordExpiresAt: {
    type: Date,
    default: null
  },
  googleId: {
    type: String,
    default: null,
    index: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  location: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  interests: [String], // tags like 'tech', 'design', 'marketing'
  website: {
    type: String,
    trim: true
  },
  socialHandles: {
    twitter: String,
    linkedin: String,
    github: String,
    instagram: String
  },
  avatar: {
    type: String, // initials or avatar URL
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'creator', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  postsCount: {
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
  }
});

module.exports = mongoose.model('User', userSchema);