import React, { useState } from 'react';
import '../styles/CommentSection.css';
import api from '../services/api';

function CommentSection({ postId, comments = [], onCommentAdded }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ author: '', email: '', content: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/comments', {
        postId,
        ...formData
      });
      setFormData({ author: '', email: '', content: '' });
      setShowForm(false);
      onCommentAdded?.();
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-section">
      <h3>Comments ({comments.length})</h3>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? 'Cancel' : 'Add Comment'}
      </button>

      {showForm && (
        <form className="comment-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name (optional)"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="form-input"
          />
          <input
            type="email"
            placeholder="Your email (optional)"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="form-input"
          />
          <textarea
            placeholder="Your comment..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
            className="form-textarea"
            rows="4"
          ></textarea>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      )}

      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <strong>{comment.author}</strong>
              <span className="comment-date">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="comment-content">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CommentSection;
