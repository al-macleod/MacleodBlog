import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import Post from '../components/Post';
import '../styles/LibraryPage.css';

const LibraryPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [filters, setFilters] = useState({
    type: '',
    sortBy: 'quality',
    search: '',
    interests: '',
    userId: ''
  });
  const sentinelRef = useRef(null);
  const filterTimeoutRef = useRef(null);

  const predefinedInterests = [
    'Technology', 'Design', 'Marketing', 'Business', 'Health',
    'Fitness', 'Travel', 'Food', 'Art', 'Music', 'Writing', 'Education'
  ];

  const loadPosts = useCallback(async (currentSkip = 0, isReset = false) => {
    if (loading && !isReset) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: 20,
        skip: currentSkip
      });

      if (filters.type) params.append('type', filters.type);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.search) params.append('search', filters.search);
      if (filters.interests) params.append('interests', filters.interests);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await api.get(`/posts/library/ranked?${params.toString()}`);
      
      if (response.data && response.data.posts) {
        if (isReset) {
          setPosts(response.data.posts);
        } else {
          setPosts(prev => [...prev, ...response.data.posts]);
        }

        setHasMore(Boolean(response.data.hasMore));
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, filters]);

  useEffect(() => {
    setPosts([]);
    setSkip(0);
    setHasMore(true);
    
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    
    filterTimeoutRef.current = setTimeout(() => {
      loadPosts(0, true);
    }, 300);

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [filters, loadPosts]);

  useEffect(() => {
    if (skip > 0) {
      loadPosts(skip, false);
    }
  }, [skip, loadPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setSkip(prev => prev + 20);
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
  }, [hasMore, loading]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="library-page">
      <div className="library-container">
        <h1>Curated Library</h1>
        
        <div className="filters-section">
          <div className="filter-group">
            <label>Type:</label>
            <select 
              value={filters.type} 
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="tweet">Tweet</option>
              <option value="article">Article</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select 
              value={filters.sortBy} 
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="quality">Quality Score</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="mostViewed">Most Viewed</option>
              <option value="mostLiked">Most Liked</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Search:</label>
            <input 
              type="text"
              placeholder="Search posts..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Interests:</label>
            <select 
              value={filters.interests} 
              onChange={(e) => handleFilterChange('interests', e.target.value)}
            >
              <option value="">All Interests</option>
              {predefinedInterests.map(interest => (
                <option key={interest} value={interest}>{interest}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="posts-list">
          {posts.map(post => (
            <div key={post.id} className="post-with-quality">
              <Post post={post} />
              <div className="quality-badge">
                Quality: {post.qualityScore ? post.qualityScore.toFixed(2) : 'N/A'}
              </div>
            </div>
          ))}
        </div>

        {loading && <div className="loader">Loading...</div>}
        
        {!loading && !hasMore && posts.length > 0 && (
          <div className="end-message">No more posts to load</div>
        )}
        
        {!loading && posts.length === 0 && (
          <div className="no-results">No posts found</div>
        )}
        
        <div ref={sentinelRef} className="sentinel" />
      </div>
    </div>
  );
};

export default LibraryPage;
