const express = require('express');
const likeController = require('../controllers/likeController');

const router = express.Router();

// Toggle like
router.post('/:postId/like', likeController.toggleLike);

// Toggle dislike
router.post('/:postId/dislike', likeController.toggleDislike);

// Toggle repost
router.post('/:postId/repost', likeController.toggleRepost);

// Check like/repost status
router.get('/:postId/status', likeController.checkStatus);

module.exports = router;
