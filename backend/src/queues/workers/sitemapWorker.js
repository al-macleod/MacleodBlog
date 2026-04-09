const path = require('path');
const fs = require('fs');
const { Worker } = require('bullmq');
const Post = require('../../models/Post');
const { getRedisConnection } = require('../connection');

const SITEMAP_PATH = path.join(__dirname, '../../../public/sitemap.xml');
const SITEMAP_DIR = path.dirname(SITEMAP_PATH);

const escapeXml = (str = '') => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const toIsoDate = (date) => new Date(date).toISOString().split('T')[0];

const buildSitemapXml = (posts, siteUrl) => {
  const urls = posts.map((post) => `
  <url>
    <loc>${escapeXml(`${siteUrl}/post/${post.slug}`)}</loc>
    <lastmod>${toIsoDate(post.updatedAt || post.createdAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${post.type === 'article' ? '0.8' : '0.6'}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(siteUrl)}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${urls}
</urlset>`;
};

const processSitemapJob = async () => {
  const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

  const posts = await Post.find({ isPublished: true })
    .select('slug type updatedAt createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const xml = buildSitemapXml(posts, siteUrl);

  if (!fs.existsSync(SITEMAP_DIR)) {
    fs.mkdirSync(SITEMAP_DIR, { recursive: true });
  }

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
  console.log(`Sitemap worker: regenerated sitemap with ${posts.length} posts → ${SITEMAP_PATH}`);
};

const createSitemapWorker = () => new Worker('sitemap', processSitemapJob, {
  connection: getRedisConnection(),
  concurrency: 1
});

module.exports = { createSitemapWorker };
