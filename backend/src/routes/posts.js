const express = require('express');
const postController = require('../controllers/postController');
const { upload } = require('../middleware/upload');
const processMedia = require('../middleware/processMedia');
const requireAdmin = require('../middleware/requireAdmin');
const requireUser = require('../middleware/requireUser');

const router = express.Router();

router.get('/admin/list', requireAdmin, postController.getAdminPosts);
router.get('/admin/analytics', requireAdmin, postController.getAdminAnalytics);

// Get all posts
router.get('/', postController.getPosts);

// Get library (ranked) posts
router.get('/library/ranked', postController.getLibrary);

// Get trending hashtags
router.get('/trending/hashtags', postController.getTrendingHashtags);

// Get single post
router.get('/:id', postController.getPost);

// Create post (authenticated user)
router.post('/', requireUser, upload.array('media', 5), processMedia, postController.createPost);

// Update post (author only)
router.put('/:id', requireUser, upload.array('media', 5), processMedia, postController.updatePost);

// Delete post (author only)
router.delete('/:id', requireUser, postController.deletePost);

module.exports = router;
