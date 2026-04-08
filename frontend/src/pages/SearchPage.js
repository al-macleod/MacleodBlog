import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../styles/SearchPage.css';
import api from '../services/api';
import Post from '../components/Post';
import Seo from '../components/Seo';

function SearchPage() {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [repostedPosts, setRepostedPosts] = useState({});

  const query = searchParams.get('q');
  const hashtag = searchParams.get('hashtag');
  const searchTerm = query || hashtag;

  useEffect(() => {
    const load = async () => {
      if (!searchTerm) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = hashtag
          ? { hashtag }
          : { search: query };

        const res = await api.get('/posts', { params });
        setResults(res.data.posts);
      } catch (error) {
        console.error('Failed to search:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [searchTerm, hashtag, query]);

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
    return <div className="loading">Searching...</div>;
  }

  return (
    <div className="search-page">
      <Seo
        title={searchTerm ? `Search: ${searchTerm}` : 'Search'}
        description="Search across articles and micro-posts on BuzzForge."
        path={`/search${window.location.search}`}
        noIndex={true}
      />
      <div className="search-header">
        <h1>Search Results</h1>
        <p className="search-term">
          {hashtag ? `Posts with #${hashtag}` : `Results for "${query}"`}
        </p>
      </div>

      <div className="search-results">
        {results.length > 0 ? (
          results.map(post => (
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
          <p className="no-results">No posts found matching your search.</p>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
