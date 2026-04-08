import React from 'react';
import { FaHeart, FaShare, FaComment } from 'react-icons/fa';
import { formatDistance } from 'date-fns';
import { Link } from 'react-router-dom';
import '../styles/Post.css';

function Post({ post, onLike, onRepost, liked, reposted }) {
  const articleLink = post.type === 'article' ? `/article/${post.slug || post.id}` : null;
  const authorName = post.author?.fullName || (post.author ? `${post.author.firstName} ${post.author.lastName}`.trim() : 'BuzzForge');
  const contentHtml = post.type === 'article' ? post.excerpt : post.content;

  return (
    <div className="post">
      <div className="post-author-row">
        <div className="post-author-meta">
          {post.author?.avatar ? <img src={post.author.avatar} alt={authorName} className="post-author-avatar" /> : null}
          <div>
            {post.author?.id ? (
              <Link to={`/profile/${post.author.id}`} className="post-author-name">{authorName}</Link>
            ) : (
              <span className="post-author-name">{authorName}</span>
            )}
            <div className="post-author-subline">{post.type === 'article' ? 'Article' : 'Random Thought'}</div>
          </div>
        </div>
        <span className="post-date">{formatDistance(new Date(post.createdAt), new Date(), { addSuffix: true })}</span>
      </div>

      <div className="post-header">
        {post.type === 'article' ? (
          articleLink ? (
            <Link to={articleLink} className="post-title-link">
              <h3 className="post-title">{post.title}</h3>
            </Link>
          ) : (
            <h3 className="post-title">{post.title}</h3>
          )
        ) : null}
      </div>

      <div className="post-content">
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </div>

      {post.media && post.media.length > 0 && (
        <div className="post-media">
          {post.media.map((item, idx) => (
            <div key={idx} className="media-item">
              {item.type === 'image' ? (
                <img src={item.url} alt={item.alt || 'Media'} />
              ) : (
                <video controls><source src={item.url} /></video>
              )}
            </div>
          ))}
        </div>
      )}

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="post-hashtags">
          {post.hashtags.map((tag, idx) => (
            <Link key={idx} to={`/search?hashtag=${tag}`} className="hashtag">#{tag}</Link>
          ))}
        </div>
      )}

      <div className="post-actions">
        {articleLink ? (
          <Link className="action-btn comment-btn" title="Comments" to={articleLink}>
            <FaComment /> <span>{post.commentsCount}</span>
          </Link>
        ) : (
          <button className="action-btn comment-btn" title="Comments" type="button">
            <FaComment /> <span>{post.commentsCount}</span>
          </button>
        )}

        <button 
          className={`action-btn repost-btn ${reposted ? 'active' : ''}`}
          onClick={() => onRepost?.(post.id)}
          title="Repost"
        >
          <FaShare /> <span>{post.reposts}</span>
        </button>

        <button 
          className={`action-btn like-btn ${liked ? 'active' : ''}`}
          onClick={() => onLike?.(post.id)}
          title="Like"
        >
          <FaHeart /> <span>{post.likes}</span>
        </button>
      </div>
    </div>
  );
}

export default Post;
