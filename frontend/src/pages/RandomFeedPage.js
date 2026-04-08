import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import Post from '../components/Post';
import Seo from '../components/Seo';
import '../styles/RandomFeedPage.css';

const RandomFeedPage = () => {
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [user, setUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [thoughtContent, setThoughtContent] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [composerMessage, setComposerMessage] = useState({ type: '', text: '' });
  const [mediaItems, setMediaItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await api.get('/users/me');
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setSessionChecked(true);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    setPosts([]);
    setSkip(0);
    setHasMore(true);
  }, [user?.id]);

  useEffect(() => {
    if (location.state?.createdPost) {
      setPosts((current) => {
        if (current.some((post) => post.id === location.state.createdPost.id)) {
          return current;
        }

        return [location.state.createdPost, ...current];
      });
    }
  }, [location.state]);

  useEffect(() => () => {
    mediaItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, [mediaItems]);

  const loadPosts = useCallback(async (currentSkip) => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const limit = user ? 20 : 3;
      const response = await api.get(`/posts?type=tweet&limit=${limit}&skip=${currentSkip}`);
      
      if (response.data && response.data.posts) {
        if (currentSkip === 0) {
          setPosts(response.data.posts);
        } else {
          setPosts(prev => [...prev, ...response.data.posts]);
        }

        if (!user) {
          setHasMore(false);
        } else if (response.data.posts.length < limit) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, user]);

  useEffect(() => {
    if (!sessionChecked) return;
    loadPosts(0);
  }, [sessionChecked, loadPosts]);

  useEffect(() => {
    if (!sessionChecked || skip === 0) return;
    loadPosts(skip);
  }, [skip, sessionChecked, loadPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setSkip((prev) => prev + (user ? 20 : 3));
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
  }, [hasMore, loading, user]);

  const handleMediaChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length === 0) {
      return;
    }

    setMediaItems((current) => {
      const nextItems = nextFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
        kind: file.type.startsWith('image/') ? 'image' : 'video'
      }));

      return [...current, ...nextItems].slice(0, 4);
    });
  };

  const removeMediaItem = (id) => {
    setMediaItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  };

  const handleThoughtSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setComposerMessage({ type: '', text: '' });

    try {
      const payload = new FormData();
      payload.append('type', 'tweet');
      payload.append('content', thoughtContent);
      payload.append('hashtags', JSON.stringify(
        hashtagsInput
          .split(',')
          .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
          .filter(Boolean)
      ));
      mediaItems.forEach((item) => payload.append('media', item.file));

      const response = await api.post('/posts', payload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setPosts((current) => [response.data, ...current]);
      setThoughtContent('');
      setHashtagsInput('');
      mediaItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setMediaItems([]);
      setComposerMessage({ type: 'success', text: 'Random thought published.' });
    } catch (error) {
      setComposerMessage({ type: 'error', text: error.response?.data?.error || 'Failed to publish thought.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="random-feed-page">
      <Seo
        title="Random Thoughts"
        description="Share raw ideas fast, drop in media, and turn quick sparks into community conversations on BuzzForge."
        path="/random"
      />
      <div className="random-feed-container">
        <div className="feed-header">
          <div>
            <h1>Random Thoughts</h1>
            <p>Short-form ideas, reactions, experiments, and sparks from the BuzzForge community.</p>
          </div>
          {user ? <Link to="/studio" className="feed-studio-link">Open Article Studio</Link> : null}
        </div>

        {user ? (
          <form className="thought-composer" onSubmit={handleThoughtSubmit}>
            <div className="thought-composer-head">
              {user.avatar ? <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="thought-avatar" /> : null}
              <div>
                <strong>{user.firstName} {user.lastName}</strong>
                <p>Drop a thought now or jump into the full studio for long-form writing.</p>
              </div>
            </div>

            {composerMessage.text ? <div className={`composer-message ${composerMessage.type}`}>{composerMessage.text}</div> : null}

            <textarea
              className="thought-input"
              placeholder="What random thought is worth sharing right now?"
              value={thoughtContent}
              onChange={(event) => setThoughtContent(event.target.value)}
              maxLength={1400}
            />

            <div className="composer-toolbar">
              <input
                type="text"
                className="composer-hashtags"
                placeholder="hashtags, comma-separated"
                value={hashtagsInput}
                onChange={(event) => setHashtagsInput(event.target.value)}
              />
              <label className="composer-upload-label">
                <input type="file" multiple accept="image/*,video/*" onChange={handleMediaChange} />
                Add media
              </label>
              <span className="composer-counter">{thoughtContent.length}/1400</span>
            </div>

            {mediaItems.length > 0 ? (
              <div className="composer-media-grid">
                {mediaItems.map((item) => (
                  <div key={item.id} className="composer-media-card">
                    {item.kind === 'image' ? (
                      <img src={item.previewUrl} alt={item.file.name} />
                    ) : (
                      <video><source src={item.previewUrl} /></video>
                    )}
                    <button type="button" onClick={() => removeMediaItem(item.id)}>Remove</button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="composer-actions">
              <Link to="/studio" className="composer-secondary-link">Need richer styling? Open full article studio</Link>
              <button type="submit" className="composer-submit" disabled={submitting || !thoughtContent.trim()}>
                {submitting ? 'Posting...' : 'Publish Thought'}
              </button>
            </div>
          </form>
        ) : null}
        
        {!user && posts.length > 0 && (
          <div className="preview-notice">
            Showing 3 posts. <Link to="/account">Sign in</Link> to write your own thought, upload media, and unlock the full feed.
          </div>
        )}
        
        <div className="feed-posts">
          {posts.map(post => (
            <Post key={post.id} post={post} />
          ))}
        </div>

        {loading && <div className="loader">Loading...</div>}
        
        {!loading && !hasMore && posts.length > 0 && (
          <div className="end-message">No more posts to load</div>
        )}
        
        <div ref={sentinelRef} className="load-more-sentinel" />
      </div>
    </div>
  );
};

export default RandomFeedPage;
