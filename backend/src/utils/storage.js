const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Signed URL validity window (seconds).  Defaults to 1 hour.
const SIGNED_URL_EXPIRY_SECONDS = (() => {
  const v = parseInt(process.env.S3_SIGNED_URL_EXPIRY, 10);
  return Number.isFinite(v) && v > 0 ? v : 3600;
})();

let _s3Client = null;
const getS3Client = () => {
  if (!_s3Client) {
    const endpoint = process.env.S3_ENDPOINT; // required for Cloudflare R2 / MinIO
    _s3Client = new S3Client({
      region: process.env.AWS_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {})
    });
  }
  return _s3Client;
};

/**
 * Returns true when all required S3 / R2 environment variables are present.
 */
const isS3Configured = () =>
  Boolean(
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );

/**
 * Upload a buffer to S3/R2 or the local uploads directory.
 *
 * @param {Buffer} buffer
 * @param {string} folder   Sub-folder name, e.g. "media" or "thumbnails".
 * @param {string} filename Target filename (uuid-based, already determined).
 * @param {string} mimeType Content-Type for the object.
 * @returns {Promise<string>} Storage key, e.g. "media/uuid.webp".
 */
async function uploadBuffer(buffer, folder, filename, mimeType) {
  const key = `${folder}/${filename}`;

  if (isS3Configured()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType
      })
    );
    return key;
  }

  // Local-disk fallback ─ save under uploads/<folder>/
  const dir = path.join(__dirname, '../../uploads', folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return key;
}

/**
 * Resolve a storage key into a URL suitable for clients.
 *
 * - S3/R2 configured  → time-limited signed URL.
 * - Local storage     → /uploads/<key> static path.
 *
 * @param {string|null} key
 * @returns {Promise<string|null>}
 */
async function getPublicUrl(key) {
  if (!key) return null;

  if (isS3Configured()) {
    return getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key }),
      { expiresIn: SIGNED_URL_EXPIRY_SECONDS }
    );
  }

  return `/uploads/${key}`;
}

/**
 * Replace storage keys stored in a media array with publicly accessible URLs.
 *
 * When using local storage the keys are already static paths so no
 * transformation is needed; when using S3/R2 each key is converted to a
 * fresh signed URL.
 *
 * @param {Array<{url?: string, thumbnailUrl?: string}>} mediaItems
 * @returns {Promise<Array>}
 */
async function resolveMediaUrls(mediaItems) {
  if (!mediaItems || mediaItems.length === 0) return mediaItems;
  if (!isS3Configured()) return mediaItems;

  return Promise.all(
    mediaItems.map(async (item) => {
      const resolved = { ...item };
      if (item.url) resolved.url = await getPublicUrl(item.url);
      if (item.thumbnailUrl) resolved.thumbnailUrl = await getPublicUrl(item.thumbnailUrl);
      return resolved;
    })
  );
}

module.exports = { uploadBuffer, getPublicUrl, resolveMediaUrls, isS3Configured };
