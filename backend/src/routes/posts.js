const express = require('express');
const postController = require('../controllers/postController');
const upload = require('../middleware/upload');
const requireAdmin = require('../middleware/requireAdmin');
const requireUser = require('../middleware/requireUser');
const validate = require('../middleware/validate');
const { createPost, updatePost, getPosts, getLibrary } = require('../validators/posts');

const router = express.Router();

router.get('/admin/list', requireAdmin, postController.getAdminPosts);
router.get('/admin/analytics', requireAdmin, postController.getAdminAnalytics);

// Get all posts
router.get('/', getPosts, validate, postController.getPosts);

// Get library (ranked) posts
router.get('/library/ranked', getLibrary, validate, postController.getLibrary);

// Get trending hashtags
router.get('/trending/hashtags', postController.getTrendingHashtags);

// Get single post
router.get('/:id', postController.getPost);

// Create post (authenticated user)
router.post('/', requireUser, upload.array('media', 5), createPost, validate, postController.createPost);

// Update post (author only)
router.put('/:id', requireUser, upload.array('media', 5), updatePost, validate, postController.updatePost);

// Delete post (author only)
router.delete('/:id', requireUser, postController.deletePost);

module.exports = router;
