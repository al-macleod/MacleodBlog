const express = require('express');
const commentController = require('../controllers/commentController');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const { createComment, getComments } = require('../validators/comments');

const router = express.Router();

router.get('/pending', requireAdmin, commentController.getPendingComments);

// Get comments for a post
router.get('/post/:postId', getComments, validate, commentController.getComments);

// Create comment
router.post('/', createComment, validate, commentController.createComment);

// Approve comment (admin)
router.put('/:id/approve', requireAdmin, commentController.approveComment);

// Delete comment (admin)
router.delete('/:id', requireAdmin, commentController.deleteComment);

module.exports = router;
