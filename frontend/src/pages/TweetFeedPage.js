import React, { useState, useEffect } from 'react';
import '../styles/TweetFeedPage.css';
import api from '../services/api';
import Post from '../components/Post';
import Seo from '../components/Seo';

function TweetFeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [repostedPosts, setRepostedPosts] = useState({});
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchPosts(0);
  }, []);

  const fetchPosts = async (newSkip = 0) => {
    try {
      setLoading(true);
      const res = await api.get(`/posts?type=tweet&limit=20&skip=${newSkip}`);
      
      if (newSkip === 0) {
        setPosts(res.data.posts);
      } else {
        setPosts(prev => [...prev, ...res.data.posts]);
      }
      
      setHasMore(res.data.hasMore);
      setSkip(newSkip + res.data.posts.length);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await api.post(`/likes/${postId}/like`);
      setLikedPosts(prev => ({
        ...prev,
        [postId]: res.data.liked
      }));
      
      // Update post likes count
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, likes: res.data.likes } : p
      ));
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

      // Update post reposts count
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, reposts: res.data.reposts } : p
      ));
    } catch (error) {
      console.error('Failed to repost:', error);
    }
  };

  const handleLoadMore = () => {
    fetchPosts(skip);
  };

  if (loading && posts.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="tweet-feed-page">
      <Seo
        title="Recent Thoughts"
        description="Short-form posts, quick reactions, and the latest updates from BuzzForge."
        path="/tweets"
      />
      <div className="feed-header">
        <h1>Recent Thoughts</h1>
      </div>

      <div className="posts-list">
        {posts.length > 0 ? (
          posts.map(post => (
            <Post
              key={post.id}
              post={post}
              onLike={handleLike}
              onRepost={handleRepost}
              liked={likedPosts[post.id]}
              reposted={repostedPosts[post.id]}
            />
          ))
        ) : (
          <p className="no-content">No posts yet.</p>
        )}
      </div>

      {hasMore && (
        <button 
          className="btn btn-primary load-more"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

export default TweetFeedPage;
