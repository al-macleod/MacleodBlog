const sanitizeHtml = require('sanitize-html');
const { v4: uuidv4 } = require('uuid');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const User = require('../models/User');
const { calculateQualityScore } = require('../utils/qualityScore');
const { resolveMediaUrls } = require('../utils/storage');
const sanitizeOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'hr',
    'h2',
    'h3',
    'h4',
    'code',
    'pre'
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer',
      target: '_blank'
    })
  }
};

const stripHtml = (value = '') => sanitizeHtml(value, {
  allowedTags: [],
  allowedAttributes: {}
}).replace(/\s+/g, ' ').trim();

const sanitizeContent = (value = '') => sanitizeHtml(value, sanitizeOptions).trim();

const normalizeHashtags = (hashtags) => {
  if (!hashtags) {
    return [];
  }

  if (Array.isArray(hashtags)) {
    return hashtags.map((tag) => String(tag).replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
  }

  if (typeof hashtags === 'string') {
    try {
      const parsed = JSON.parse(hashtags);
      if (Array.isArray(parsed)) {
        return parsed.map((tag) => String(tag).replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
      }
    } catch (error) {
      return hashtags
        .split(',')
        .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
        .filter(Boolean);
    }
  }

  return [];
};

const normalizeInterests = (interests) => {
  if (!interests) {
    return [];
  }

  if (Array.isArray(interests)) {
    return interests.map((interest) => String(interest).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof interests === 'string') {
    try {
      const parsed = JSON.parse(interests);
      if (Array.isArray(parsed)) {
        return parsed.map((interest) => String(interest).trim().toLowerCase()).filter(Boolean);
      }
    } catch (error) {
      return interests
        .split(',')
        .map((interest) => interest.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  return [];
};

const normalizeMedia = (files = [], existingMedia = [], replaceMedia = false) => {
  const uploadedMedia = files.map((file) => {
    const item = {
      // mediaType is set by processMedia middleware; fall back to MIME sniff for
      // any file that bypassed that middleware (e.g. tests).
      type: file.mediaType || (file.mimetype && file.mimetype.startsWith('image/') ? 'image' : 'video'),
      // storageKey is the S3/R2 key or local relative path set by processMedia.
      // Fall back to the legacy multer disk-storage filename for compatibility.
      url: file.storageKey || (file.filename ? `/uploads/${file.filename}` : ''),
      alt: file.originalname
    };

    if (file.thumbnailKey) {
      item.thumbnailUrl = file.thumbnailKey;
    }

    return item;
  });

  if (replaceMedia) {
    return uploadedMedia;
  }

  return [...existingMedia, ...uploadedMedia];
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return fallback;
};

const slugify = (value = '') => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-') || 'post';

const ensureUniqueSlug = async (baseSlug, currentPostId = null) => {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Post.findOne({ slug });
    if (!existing || existing.id === currentPostId) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
};

const findPublishedPost = (identifier) => Post.findOne({
  isPublished: true,
  $or: [{ id: identifier }, { slug: identifier }]
});

const buildExcerpt = (excerpt, content) => {
  const plainExcerpt = stripHtml(excerpt || '');
  if (plainExcerpt) {
    return plainExcerpt.slice(0, 180);
  }

  return stripHtml(content).slice(0, 180);
};

const buildSeoDescription = (seoDescription, excerpt, content) => {
  const plainSeoDescription = stripHtml(seoDescription || '');
  if (plainSeoDescription) {
    return plainSeoDescription.slice(0, 160);
  }

  return buildExcerpt(excerpt, content).slice(0, 160);
};

const buildAuthorSummary = (author) => {
  if (!author) {
    return null;
  }

  return {
    id: author.id,
    firstName: author.firstName,
    lastName: author.lastName,
    fullName: `${author.firstName} ${author.lastName}`.trim(),
    avatar: author.avatar,
    role: author.role,
    postsCount: author.postsCount || 0
  };
};

const enrichPostsWithAuthors = async (posts) => {
  const normalizedPosts = posts.map((post) => (typeof post.toObject === 'function' ? post.toObject() : post));
  const authorIds = [...new Set(normalizedPosts.map((post) => post.authorId).filter(Boolean))];

  // Resolve media storage keys to public / signed URLs for every post.
  const postsWithMedia = await Promise.all(
    normalizedPosts.map(async (post) => ({
      ...post,
      media: await resolveMediaUrls(post.media || [])
    }))
  );

  if (authorIds.length === 0) {
    return postsWithMedia;
  }

  const authors = await User.find({ id: { $in: authorIds } }).lean();
  const authorMap = new Map(authors.map((author) => [author.id, author]));

  return postsWithMedia.map((post) => ({
    ...post,
    author: buildAuthorSummary(authorMap.get(post.authorId))
  }));
};

const ensureAuthorCanManagePost = (post, userId) => {
  if (!post || post.authorId !== userId) {
    const error = new Error('You can only manage your own posts');
    error.statusCode = 403;
    throw error;
  }
};

// Get all posts or filter by type
exports.getPosts = async (req, res) => {
  try {
    const { type, hashtag, search, userId, limit = 20, skip = 0 } = req.query;

    let query = { isPublished: true };

    if (type) query.type = type;
    if (userId) query.authorId = userId;

    if (hashtag) {
      query.hashtags = { $in: [hashtag] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { hashtags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Post.countDocuments(query);

    const enrichedPosts = await enrichPostsWithAuthors(posts);

    res.json({
      posts: enrichedPosts,
      total,
      hasMore: skip + posts.length < total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminPosts = async (req, res) => {
  try {
    const { type, limit = 50, skip = 0 } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    const posts = await Post.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10));

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      total,
      hasMore: parseInt(skip, 10) + posts.length < total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single post
exports.getPost = async (req, res) => {
  try {
    const post = await findPublishedPost(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.views = (post.views || 0) + 1;
    post.updatedAt = post.updatedAt || new Date();
    await post.save();

    const [enrichedPost] = await enrichPostsWithAuthors([post]);

    res.json(enrichedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminAnalytics = async (req, res) => {
  try {
    const totals = await Post.aggregate([
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalDislikes: { $sum: '$dislikes' },
          totalReposts: { $sum: '$reposts' },
          totalComments: { $sum: '$commentsCount' }
        }
      }
    ]);

    const byType = await Post.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          views: { $sum: '$views' },
          likes: { $sum: '$likes' },
          dislikes: { $sum: '$dislikes' },
          reposts: { $sum: '$reposts' },
          comments: { $sum: '$commentsCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const topPosts = await Post.find({ isPublished: true })
      .sort({ views: -1, likes: -1 })
      .limit(10)
      .select('id slug title type views likes dislikes reposts commentsCount createdAt');

    res.json({
      totals: totals[0] || {
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalDislikes: 0,
        totalReposts: 0,
        totalComments: 0
      },
      byType,
      topPosts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create post
exports.createPost = async (req, res) => {
  try {
    const { title, content, excerpt, type = 'tweet', seoTitle, seoDescription } = req.body;
    const user = await User.findOne({ id: req.user.userId, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const normalizedType = type === 'article' ? 'article' : 'tweet';
    const cleanContent = sanitizeContent(content || '');
    const providedTitle = stripHtml(title || '');
    const generatedTitle = stripHtml(content || '').slice(0, normalizedType === 'article' ? 90 : 60);
    const cleanTitle = providedTitle || generatedTitle || (normalizedType === 'article' ? 'Untitled article' : 'Untitled thought');

    if (!cleanContent) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (normalizedType === 'article' && !providedTitle) {
      return res.status(400).json({ error: 'Article title is required' });
    }

    const hashtags = normalizeHashtags(req.body.hashtags);
    const interests = normalizeInterests(req.body.interests);
    const media = normalizeMedia(req.files || []);
    const slug = await ensureUniqueSlug(slugify(req.body.slug || cleanTitle));
    const published = normalizeBoolean(req.body.isPublished, true);
    const normalizedExcerpt = buildExcerpt(excerpt, cleanContent);

    const newPost = new Post({
      id: uuidv4(),
      authorId: user.id,
      title: cleanTitle,
      slug,
      content: cleanContent,
      excerpt: normalizedExcerpt,
      seoTitle: stripHtml(seoTitle || cleanTitle).slice(0, 70),
      seoDescription: buildSeoDescription(seoDescription, normalizedExcerpt, cleanContent),
      type: normalizedType,
      media,
      hashtags,
      interests,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: published
    });

    await newPost.save();
    user.postsCount = (user.postsCount || 0) + 1;
    user.updatedAt = new Date();
    await user.save();

    const [enrichedPost] = await enrichPostsWithAuthors([newPost]);
    res.status(201).json(enrichedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { title, content, excerpt, isPublished, seoTitle, seoDescription } = req.body;
    const postId = req.params.id;

    const post = await Post.findOne({ id: postId });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    ensureAuthorCanManagePost(post, req.user.userId);

    if (title) {
      const cleanTitle = stripHtml(title);
      post.title = cleanTitle;
      post.slug = await ensureUniqueSlug(slugify(req.body.slug || cleanTitle), post.id);
    }

    if (content) post.content = sanitizeContent(content);
    if (excerpt !== undefined) post.excerpt = buildExcerpt(excerpt, post.content);
    if (req.files && req.files.length > 0) {
      post.media = normalizeMedia(
        req.files,
        post.media || [],
        normalizeBoolean(req.body.replaceMedia, false)
      );
    }
    if (req.body.hashtags !== undefined) post.hashtags = normalizeHashtags(req.body.hashtags);
    if (req.body.interests !== undefined) post.interests = normalizeInterests(req.body.interests);
    if (seoTitle !== undefined) post.seoTitle = stripHtml(seoTitle || post.title).slice(0, 70);
    if (seoDescription !== undefined || excerpt !== undefined || content !== undefined) {
      post.seoDescription = buildSeoDescription(seoDescription, post.excerpt, post.content);
    }
    if (isPublished !== undefined) post.isPublished = normalizeBoolean(isPublished, post.isPublished);

    post.updatedAt = new Date();
    await post.save();

    const [enrichedPost] = await enrichPostsWithAuthors([post]);
    res.json(enrichedPost);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ id: req.params.id });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    ensureAuthorCanManagePost(post, req.user.userId);

    await Comment.deleteMany({ postId: post.id });
    await Like.deleteMany({ postId: post.id });

    await User.updateOne(
      { id: req.user.userId },
      {
        $inc: { postsCount: -1 },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

// Get trending hashtags
exports.getTrendingHashtags = async (req, res) => {
  try {
    const hashtags = await Post.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json(hashtags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get library posts ranked by quality score
exports.getLibrary = async (req, res) => {
  try {
    const {
      type,
      search,
      interests,
      userId,
      sortBy = 'quality',
      limit = 20,
      skip = 0
    } = req.query;

    let query = { isPublished: true };

    if (type) query.type = type;

    if (userId) query.authorId = userId;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { hashtags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (interests) {
      const interestArray = interests.split(',').map(i => i.trim().toLowerCase());
      query.interests = { $in: interestArray };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) + 100) // Get extra for scoring and filtering
      .lean();

    // Fetch all authors in one query for efficiency
    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const authors = await User.find({ id: { $in: authorIds } }).lean();
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));

    // Calculate quality scores
    const postsWithScores = posts.map(post => ({
      ...post,
      qualityScore: calculateQualityScore(post, authorMap[post.authorId] || {})
    }));

    // Sort by requested criteria
    let sortedPosts = [...postsWithScores];
    if (sortBy === 'quality') {
      sortedPosts.sort((a, b) => b.qualityScore - a.qualityScore);
    } else if (sortBy === 'newest') {
      sortedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      sortedPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'mostViewed') {
      sortedPosts.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'mostLiked') {
      sortedPosts.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
    }

    // Slice to requested range
    const paginatedPosts = sortedPosts.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

    const total = await Post.countDocuments(query);

    // Enrich posts with author info
    const enrichedPosts = paginatedPosts.map(post => ({
      ...post,
      author: buildAuthorSummary(authorMap[post.authorId])
    }));

    res.json({
      posts: enrichedPosts,
      total,
      hasMore: parseInt(skip) + paginatedPosts.length < total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
