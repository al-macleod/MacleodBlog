import React, { useState, useEffect } from 'react';
import '../styles/HomePage.css';
import api from '../services/api';
import Post from '../components/Post';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

function HomePage() {
  const [articles, setArticles] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [repostedPosts, setRepostedPosts] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [articlesRes, tweetsRes] = await Promise.all([
          api.get('/posts?type=article&limit=5'),
          api.get('/posts?type=tweet&limit=10')
        ]);

        setArticles(articlesRes.data.posts);
        setTweets(tweetsRes.data.posts);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleLike = async (postId) => {
    try {
      const res = await api.post(`/likes/${postId}/like`);
      setLikedPosts(prev => ({
        ...prev,
        [postId]: res.data.liked
      }));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleRepost = async (postId) => {
    try {
      const res = await api.post(`/likes/${postId}/repost`);
      setRepostedPosts(prev => ({
        ...prev,
        [postId]: res.data.reposted
      }));
    } catch (error) {
      console.error('Failed to repost:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-page">
      <Seo
        title="BuzzForge | Viral Thought Engine"
        description="BuzzForge is a fast, social writing network where random thoughts and deep library articles compete on real community quality."
        path="/"
      />
      <section className="hero">
        <h1>Welcome to BuzzForge</h1>
        <p>Turn your raw ideas into viral momentum.</p>
        <div className="hero-cta-row">
          <Link to="/random" className="hero-cta primary">Open Random Thoughts</Link>
          <Link to="/library" className="hero-cta secondary">Explore Library</Link>
        </div>
      </section>

      <section className="featured-articles">
        <div className="section-header">
          <h2>Featured Articles</h2>
          <Link to="/library" className="view-all-link">Open Library →</Link>
        </div>

        <div className="articles-grid">
          {articles.length > 0 ? (
            articles.map(article => (
              <Link key={article.id} to={`/article/${article.slug || article.id}`} className="article-card-link">
                <div className="article-card">
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <div className="article-meta">
                    <span className="date">
                      {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                    <span className="read-more">Read More →</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="no-content">No articles yet.</p>
          )}
        </div>
      </section>

      <section className="recent-posts">
        <div className="section-header">
          <h2>Random Thoughts Feed</h2>
          <Link to="/random" className="view-all-link">Jump Into Feed →</Link>
        </div>

        <div className="posts-list">
          {tweets.length > 0 ? (
            tweets.map(tweet => (
              <Post
                key={tweet.id}
                post={tweet}
                onLike={handleLike}
                onRepost={handleRepost}
                liked={likedPosts[tweet.id]}
                reposted={repostedPosts[tweet.id]}
              />
            ))
          ) : (
            <p className="no-content">No posts yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
