import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import RichTextEditor from '../components/RichTextEditor';
import Seo from '../components/Seo';
import '../styles/WritingStudioPage.css';

const articleTemplates = [
  {
    id: 'standard',
    name: 'Standard Story',
    description: 'Classic intro, body, and close for essays and opinion pieces.',
    content: '<p>Open with a sharp hook that frames the idea.</p><h2>Main Insight</h2><p>Develop the core argument with examples, context, and evidence.</p><h3>Why It Matters</h3><p>Explain the consequence, opportunity, or takeaway.</p><p>Close with a memorable final line.</p>'
  },
  {
    id: 'listicle',
    name: 'Listicle',
    description: 'A ranked or numbered structure for high-scan articles.',
    content: '<p>Introduce the theme and set up the list.</p><h2>1. First Point</h2><p>Explain the first point clearly.</p><h2>2. Second Point</h2><p>Add a supporting example or lesson.</p><h2>3. Third Point</h2><p>Close the list with the strongest item.</p>'
  },
  {
    id: 'tutorial',
    name: 'Tutorial',
    description: 'Step-by-step structure with setup, walkthrough, and recap.',
    content: '<p>State what the reader will learn and who this is for.</p><h2>What You Need</h2><ul><li>Requirement one</li><li>Requirement two</li></ul><h2>Step 1</h2><p>Describe the first action.</p><h2>Step 2</h2><p>Describe the second action.</p><h2>Wrap-Up</h2><p>Summarize the result and next move.</p>'
  }
];

const predefinedInterests = [
  'Technology', 'Design', 'Marketing', 'Business', 'Health', 'Fitness',
  'Travel', 'Food', 'Art', 'Music', 'Writing', 'Education'
];

const initialArticle = {
  title: '',
  content: '',
  excerpt: '',
  seoTitle: '',
  seoDescription: '',
  slug: '',
  hashtags: '',
  isPublished: true,
  interests: [],
  templateId: 'standard'
};

const stripHtml = (value = '') => {
  const container = document.createElement('div');
  container.innerHTML = value;
  return (container.textContent || container.innerText || '').replace(/\s+/g, ' ').trim();
};

const toSlug = (value = '') => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

const parseTags = (value = '') => value
  .split(',')
  .map((item) => item.replace(/^#/, '').trim().toLowerCase())
  .filter(Boolean);

function WritingStudioPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [article, setArticle] = useState(initialArticle);
  const [previewMode, setPreviewMode] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await api.get('/users/me');
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setSessionLoading(false);
      }
    };

    loadSession();
  }, []);

  useEffect(() => () => {
    mediaItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, [mediaItems]);

  useEffect(() => {
    if (!slugTouched) {
      setArticle((current) => ({
        ...current,
        slug: toSlug(current.title)
      }));
    }
  }, [article.title, slugTouched]);

  const plainText = useMemo(() => stripHtml(article.content), [article.content]);
  const wordCount = useMemo(() => (plainText ? plainText.split(/\s+/).length : 0), [plainText]);
  const readTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 220)), [wordCount]);

  const selectedTemplate = articleTemplates.find((template) => template.id === article.templateId) || articleTemplates[0];

  const updateArticle = (field, value) => {
    setArticle((current) => ({ ...current, [field]: value }));
  };

  const applyTemplate = (template) => {
    setArticle((current) => ({
      ...current,
      templateId: template.id,
      content: template.content,
      excerpt: current.excerpt || stripHtml(template.content).slice(0, 180)
    }));
  };

  const handleInterestToggle = (interest) => {
    setArticle((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest]
    }));
  };

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

      return [...current, ...nextItems].slice(0, 5);
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

  const generateExcerpt = () => {
    updateArticle('excerpt', plainText.slice(0, 180));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const payload = new FormData();
      payload.append('type', 'article');
      payload.append('title', article.title);
      payload.append('content', article.content);
      payload.append('excerpt', article.excerpt || plainText.slice(0, 180));
      payload.append('seoTitle', article.seoTitle || article.title);
      payload.append('seoDescription', article.seoDescription || (article.excerpt || plainText.slice(0, 160)));
      payload.append('slug', article.slug || toSlug(article.title));
      payload.append('hashtags', JSON.stringify(parseTags(article.hashtags)));
      payload.append('interests', JSON.stringify(article.interests));
      payload.append('isPublished', String(article.isPublished));
      mediaItems.forEach((item) => payload.append('media', item.file));

      const response = await api.post('/posts', payload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setStatusMessage({ type: 'success', text: 'Article published successfully.' });
      navigate(`/article/${response.data.slug || response.data.id}`);
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.response?.data?.error || 'Failed to publish article.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading) {
    return <div className="loading">Loading writing studio...</div>;
  }

  if (!user) {
    return (
      <div className="writing-studio-page">
        <Seo title="Writing Studio" description="Create rich articles and styled posts on BuzzForge." path="/studio" noIndex={true} />
        <div className="studio-gate">
          <h1>Writing Studio</h1>
          <p>Sign in to publish random thoughts, polished articles, media-rich posts, and styled layouts.</p>
          <Link to="/account" className="studio-gate-link">Join or log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="writing-studio-page">
      <Seo title="Writing Studio" description="Create rich articles with templates, media, preview, and SEO controls on BuzzForge." path="/studio" noIndex={true} />
      <div className="studio-shell">
        <div className="studio-header">
          <div>
            <p className="studio-eyebrow">Creator Workflow</p>
            <h1>Full Blog Article Studio</h1>
            <p className="studio-subtitle">Rich text, media uploads, one-click layouts, live preview, metadata, and publishing controls in one place.</p>
          </div>
          <div className="studio-stats">
            <div><strong>{wordCount}</strong><span>Words</span></div>
            <div><strong>{readTime} min</strong><span>Read time</span></div>
            <div><strong>{mediaItems.length}/5</strong><span>Media</span></div>
          </div>
        </div>

        {statusMessage.text ? <div className={`studio-message ${statusMessage.type}`}>{statusMessage.text}</div> : null}

        <form className="studio-layout" onSubmit={handleSubmit}>
          <section className="studio-main">
            <div className="studio-panel">
              <div className="studio-panel-header">
                <h2>Article Setup</h2>
                <div className="studio-toggle-row">
                  <button type="button" className={`studio-toggle ${!previewMode ? 'active' : ''}`} onClick={() => setPreviewMode(false)}>Edit</button>
                  <button type="button" className={`studio-toggle ${previewMode ? 'active' : ''}`} onClick={() => setPreviewMode(true)}>Preview</button>
                </div>
              </div>

              <label className="studio-field-label">Headline</label>
              <input
                type="text"
                className="studio-input"
                placeholder="Write a strong, specific article title"
                value={article.title}
                onChange={(event) => updateArticle('title', event.target.value)}
              />

              <div className="studio-inline-grid">
                <div>
                  <label className="studio-field-label">Slug</label>
                  <input
                    type="text"
                    className="studio-input"
                    value={article.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      updateArticle('slug', toSlug(event.target.value));
                    }}
                    placeholder="article-url-slug"
                  />
                </div>
                <div>
                  <label className="studio-field-label">Status</label>
                  <select
                    className="studio-input"
                    value={article.isPublished ? 'published' : 'draft'}
                    onChange={(event) => updateArticle('isPublished', event.target.value === 'published')}
                  >
                    <option value="published">Publish immediately</option>
                    <option value="draft">Save as draft</option>
                  </select>
                </div>
              </div>

              <div className="template-grid">
                {articleTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`template-card ${article.templateId === template.id ? 'active' : ''}`}
                    onClick={() => applyTemplate(template)}
                  >
                    <strong>{template.name}</strong>
                    <span>{template.description}</span>
                  </button>
                ))}
              </div>

              <div className="studio-template-note">
                <strong>Current template:</strong> {selectedTemplate.name}
              </div>

              <label className="studio-field-label">Article Excerpt</label>
              <textarea
                className="studio-textarea studio-textarea-sm"
                placeholder="Short summary for cards, search, and previews"
                value={article.excerpt}
                onChange={(event) => updateArticle('excerpt', event.target.value)}
              />

              <div className="studio-actions-row">
                <button type="button" className="secondary-button" onClick={generateExcerpt}>Auto-generate excerpt</button>
                <span className="studio-helper">Pulled from the current article body.</span>
              </div>

              {!previewMode ? (
                <RichTextEditor
                  value={article.content}
                  onChange={(nextValue) => updateArticle('content', nextValue)}
                  placeholder="Write the full article here. Use the toolbar for styling, structure, code blocks, callouts, and layout helpers."
                />
              ) : (
                <div className="article-preview-surface">
                  <h1>{article.title || 'Untitled article'}</h1>
                  <p className="article-preview-subline">By {user.firstName} {user.lastName}</p>
                  {mediaItems[0] ? (
                    mediaItems[0].kind === 'image' ? (
                      <img src={mediaItems[0].previewUrl} alt="Cover preview" className="article-preview-cover" />
                    ) : (
                      <video controls className="article-preview-cover"><source src={mediaItems[0].previewUrl} /></video>
                    )
                  ) : null}
                  <div className="article-preview-content" dangerouslySetInnerHTML={{ __html: article.content || '<p>Nothing to preview yet.</p>' }} />
                </div>
              )}
            </div>
          </section>

          <aside className="studio-sidebar">
            <div className="studio-panel">
              <h2>Media Uploads</h2>
              <label className="upload-dropzone">
                <input type="file" multiple accept="image/*,video/*" onChange={handleMediaChange} />
                <span>Drop or choose up to 5 images/videos</span>
              </label>

              {mediaItems.length > 0 ? (
                <div className="media-preview-grid">
                  {mediaItems.map((item) => (
                    <div key={item.id} className="media-preview-card">
                      {item.kind === 'image' ? (
                        <img src={item.previewUrl} alt={item.file.name} />
                      ) : (
                        <video><source src={item.previewUrl} /></video>
                      )}
                      <button type="button" className="media-remove-button" onClick={() => removeMediaItem(item.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="studio-panel">
              <h2>Discovery Controls</h2>
              <label className="studio-field-label">SEO Title</label>
              <input
                type="text"
                className="studio-input"
                maxLength={70}
                value={article.seoTitle}
                onChange={(event) => updateArticle('seoTitle', event.target.value)}
                placeholder="Search-friendly title"
              />
              <span className="studio-counter">{article.seoTitle.length}/70</span>

              <label className="studio-field-label">SEO Description</label>
              <textarea
                className="studio-textarea"
                maxLength={160}
                value={article.seoDescription}
                onChange={(event) => updateArticle('seoDescription', event.target.value)}
                placeholder="Meta description for search and social previews"
              />
              <span className="studio-counter">{article.seoDescription.length}/160</span>

              <label className="studio-field-label">Hashtags</label>
              <input
                type="text"
                className="studio-input"
                value={article.hashtags}
                onChange={(event) => updateArticle('hashtags', event.target.value)}
                placeholder="creativity, startups, design"
              />

              <label className="studio-field-label">Audience Interests</label>
              <div className="interest-chip-grid">
                {predefinedInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className={`interest-chip ${article.interests.includes(interest) ? 'active' : ''}`}
                    onClick={() => handleInterestToggle(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="studio-panel">
              <h2>Publishing</h2>
              <ul className="feature-checklist">
                <li>Rich text formatting</li>
                <li>One-click layout templates</li>
                <li>Media uploads with preview</li>
                <li>Auto slug generation</li>
                <li>Auto excerpt generator</li>
                <li>Live preview mode</li>
                <li>Word count</li>
                <li>Reading time estimate</li>
                <li>SEO title/description controls</li>
                <li>Hashtag tagging</li>
                <li>Interest targeting</li>
                <li>Draft/publish toggle</li>
              </ul>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Publishing...' : article.isPublished ? 'Publish Article' : 'Save Draft'}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

export default WritingStudioPage;