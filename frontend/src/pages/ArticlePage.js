import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/ArticlePage.css';
import api from '../services/api';
import CommentSection from '../components/CommentSection';
import { FaHeart, FaShare } from 'react-icons/fa';
import Seo from '../components/Seo';

function ArticlePage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [loading, setLoading] = useState(true);
  const authorName = article?.author?.fullName || (article?.author ? `${article.author.firstName} ${article.author.lastName}`.trim() : 'BuzzForge');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const articleRes = await api.get(`/posts/${id}`);
        setArticle(articleRes.data);

        const postId = articleRes.data.id;
        const [commentsRes, statusRes] = await Promise.all([
          api.get(`/comments/post/${postId}`),
          api.get(`/likes/${postId}/status`)
        ]);

        setComments(commentsRes.data.comments);
        setLiked(statusRes.data.liked);
        setReposted(statusRes.data.reposted);
      } catch (error) {
        console.error('Failed to fetch article:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments/post/${article.id}`);
      setComments(res.data.comments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleLike = async () => {
    try {
      const res = await api.post(`/likes/${article.id}/like`);
      setLiked(res.data.liked);
      setArticle({
        ...article,
        likes: res.data.likes
      });
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  const handleRepost = async () => {
    try {
      const res = await api.post(`/likes/${article.id}/repost`);
      setReposted(res.data.reposted);
      setArticle({
        ...article,
        reposts: res.data.reposts
      });
    } catch (error) {
      console.error('Failed to repost:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!article) {
    return <div className="error">Article not found.</div>;
  }

  return (
    <div className="article-page">
      <Seo
        title={article.seoTitle || article.title}
        description={article.seoDescription || article.excerpt}
        path={`/article/${article.slug || article.id}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.seoTitle || article.title,
          description: article.seoDescription || article.excerpt,
          datePublished: article.createdAt,
          dateModified: article.updatedAt,
          author: {
            '@type': 'Person',
            name: authorName
          }
        }}
      />
      <article className="article-content">
        <header className="article-header">
          <h1>{article.title}</h1>
          <div className="article-meta">
            <span className="date">{new Date(article.createdAt).toLocaleDateString()}</span>
            <span className="author">By {authorName}</span>
          </div>
        </header>

        {article.media && article.media.length > 0 && (
          <div className="article-featured-media">
            {article.media[0].type === 'image' ? (
              <img src={article.media[0].url} alt="Featured" />
            ) : (
              <video controls><source src={article.media[0].url} /></video>
            )}
          </div>
        )}

        <div className="article-body">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        {article.hashtags && article.hashtags.length > 0 && (
          <div className="article-hashtags">
            {article.hashtags.map((tag, idx) => (
              <a key={idx} href={`/search?hashtag=${tag}`} className="hashtag">#{tag}</a>
            ))}
          </div>
        )}

        <div className="article-actions">
          <button 
            className={`action-btn like-btn ${liked ? 'active' : ''}`}
            onClick={handleLike}
          >
            <FaHeart /> {article.likes} Likes
          </button>
          <button 
            className={`action-btn repost-btn ${reposted ? 'active' : ''}`}
            onClick={handleRepost}
          >
            <FaShare /> {article.reposts} Shares
          </button>
        </div>
      </article>

      <CommentSection 
        postId={article.id} 
        comments={comments}
        onCommentAdded={fetchComments}
      />
    </div>
  );
}

export default ArticlePage;
