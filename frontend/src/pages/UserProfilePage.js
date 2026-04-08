import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Post from '../components/Post';
import '../styles/UserProfilePage.css';

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await api.get('/users/me');
        setCurrentUserId(response.data.user.id);
      } catch (error) {
        setCurrentUserId(null);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get(`/users/profile/${userId}`);
        setUser(response.data.user);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const loadUserPosts = useCallback(async (currentSkip) => {
    if (postsLoading || !hasMore) return;
    
    setPostsLoading(true);
    try {
      const response = await api.get(`/posts?userId=${userId}&limit=20&skip=${currentSkip}`);
      
      if (response.data && response.data.posts) {
        if (currentSkip === 0) {
          setPosts(response.data.posts);
        } else {
          setPosts(prev => [...prev, ...response.data.posts]);
        }
        
        if (response.data.posts.length < 20) {
          setHasMore(false);
        } else {
          setSkip(prev => prev + 20);
        }
      }
    } catch (error) {
      console.error('Failed to load user posts:', error);
      setHasMore(false);
    } finally {
      setPostsLoading(false);
    }
  }, [postsLoading, hasMore, userId]);

  useEffect(() => {
    if (!userId) return;
    setPosts([]);
    setSkip(0);
    setHasMore(true);
  }, [userId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !postsLoading) {
          setSkip((prev) => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    const node = sentinelRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) {
        observer.unobserve(node);
      }
    };
  }, [hasMore, postsLoading]);

  useEffect(() => {
    if (userId) {
      loadUserPosts(0);
    }
  }, [userId, loadUserPosts]);

  useEffect(() => {
    if (!userId || skip === 0) return;
    loadUserPosts(skip);
  }, [skip, userId, loadUserPosts]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${user.firstName} ${user.lastName}'s Profile`,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return <div className="user-profile-page"><div className="loader">Loading...</div></div>;
  }

  if (!user) {
    return <div className="user-profile-page"><div className="error">User not found</div></div>;
  }

  const isOwnProfile = currentUserId === userId;
  const accountAge = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';

  return (
    <div className="user-profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-info">
            {user.avatar && (
              <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="profile-avatar" />
            )}
            <div className="profile-details">
              <h1>{user.firstName} {user.lastName}</h1>
              <p className="profile-bio">{user.bio || 'No bio yet'}</p>
              
              <div className="profile-meta">
                {user.location && <span className="meta-item">📍 {user.location}</span>}
                {user.website && <span className="meta-item">🔗 {user.website}</span>}
                <span className="meta-item">📅 Joined {accountAge}</span>
                <span className="meta-item">📝 {user.postsCount || 0} posts</span>
              </div>

              {user.interests && user.interests.length > 0 && (
                <div className="profile-interests">
                  {user.interests.map(interest => (
                    <span key={interest} className="interest-tag">{interest}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={handleShare} className="btn btn-secondary">Share Profile</button>
            {isOwnProfile && (
              <button onClick={() => navigate('/settings')} className="btn btn-primary">
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="profile-posts">
          <h2>Posts</h2>
          
          {posts.length > 0 ? (
            <div className="posts-list">
              {posts.map(post => (
                <Post key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="no-posts">No posts yet</div>
          )}

          {postsLoading && <div className="loader">Loading...</div>}
          
          {!postsLoading && !hasMore && posts.length > 0 && (
            <div className="end-message">No more posts</div>
          )}
          
          <div ref={sentinelRef} className="sentinel" />
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
