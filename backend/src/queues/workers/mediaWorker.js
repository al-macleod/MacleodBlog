const path = require('path');
const fs = require('fs');
const { Worker } = require('bullmq');
const sharp = require('sharp');
const { getRedisConnection } = require('../connection');

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_SUFFIX = '-thumb';
const OPTIMIZED_SUFFIX = '-opt';

const getOutputPaths = (filePath) => {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);

  return {
    optimized: path.join(dir, `${base}${OPTIMIZED_SUFFIX}.webp`),
    thumbnail: path.join(dir, `${base}${THUMBNAIL_SUFFIX}.webp`)
  };
};

const processMediaJob = async (job) => {
  const { filePath, mimeType } = job.data;

  if (!mimeType || !mimeType.startsWith('image/')) {
    console.log('Media worker: skipping non-image file', mimeType);
    return;
  }

  if (!fs.existsSync(filePath)) {
    console.warn('Media worker: file not found, skipping:', filePath);
    return;
  }

  const { optimized, thumbnail } = getOutputPaths(filePath);

  // Optimized full-size version (lossless webp, strip metadata)
  await sharp(filePath)
    .webp({ quality: 82 })
    .toFile(optimized);

  // Thumbnail (400px wide, auto height)
  await sharp(filePath)
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(thumbnail);

  // Replace original with optimized version
  fs.renameSync(optimized, filePath.replace(/\.[^/.]+$/, '.webp'));

  // Remove original non-webp file if still present
  const originalWebp = filePath.replace(/\.[^/.]+$/, '.webp');
  if (originalWebp !== filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  console.log(`Media worker: optimized ${path.basename(filePath)}, thumbnail → ${path.basename(thumbnail)}`);
};

const createMediaWorker = () => new Worker('media', processMediaJob, {
  connection: getRedisConnection(),
  concurrency: 2
});

module.exports = { createMediaWorker };
