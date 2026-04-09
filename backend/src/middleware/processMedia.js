const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { detectMimeFromBuffer } = require('../utils/magicBytes');
const { scanBuffer } = require('../utils/virusScan');
const { processImage } = require('../utils/imageProcessor');
const { extractThumbnail } = require('../utils/videoProcessor');
const { uploadBuffer } = require('../utils/storage');
const { IMAGE_MAX_SIZE, VIDEO_MAX_SIZE } = require('./upload');

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm']);
const ALL_ALLOWED_MIMES = new Set([...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES]);

/**
 * Validate that the buffer's actual magic bytes match an allowed type and are
 * consistent with the MIME type declared in the multipart Content-Type header.
 *
 * @throws {Error} with statusCode 400 on validation failure.
 * @returns {string} The detected MIME type.
 */
function validateMagicBytes(buffer, declaredMime) {
  const detected = detectMimeFromBuffer(buffer);

  if (!detected) {
    const err = new Error('Could not determine file type from content');
    err.statusCode = 400;
    throw err;
  }

  if (!ALL_ALLOWED_MIMES.has(detected)) {
    const err = new Error(`File type ${detected} is not allowed`);
    err.statusCode = 400;
    throw err;
  }

  // Prevent MIME spoofing: declared type must match what the bytes actually are.
  // Allow jpeg/jpg aliases.
  const normalised = declaredMime === 'image/jpg' ? 'image/jpeg' : declaredMime;
  if (normalised !== detected) {
    const err = new Error(
      `Declared file type (${declaredMime}) does not match detected type (${detected})`
    );
    err.statusCode = 400;
    throw err;
  }

  return detected;
}

/**
 * Express middleware that processes each uploaded file through the full
 * pipeline:
 *
 *   1. Magic-bytes validation  – confirms actual file type, prevents spoofing.
 *   2. Virus scan              – stub; swap for real AV in production.
 *   3a. Image processing       – compress + convert to WebP via sharp.
 *   3b. Video upload           – store as-is; extract thumbnail via ffmpeg.
 *   4. Storage upload          – S3/R2 when configured, local disk otherwise.
 *
 * After the middleware runs, each object in req.files is augmented with:
 *   - mediaType:    'image' | 'video'
 *   - storageKey:   object key used to store the main file
 *   - thumbnailKey: object key for the video thumbnail (videos only, may be null)
 *
 * Must be placed AFTER multer (which must use memoryStorage).
 */
async function processMedia(req, res, next) {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const processed = await Promise.all(
      req.files.map(async (file) => {
        // 1. Magic-bytes validation
        const detectedMime = validateMagicBytes(file.buffer, file.mimetype);

        // 1b. Per-type file size enforcement
        const isImage = ALLOWED_IMAGE_MIMES.has(detectedMime);
        const sizeLimit = isImage ? IMAGE_MAX_SIZE : VIDEO_MAX_SIZE;
        if (file.buffer.length > sizeLimit) {
          const limitMB = (sizeLimit / 1048576).toFixed(0);
          const err = new Error(
            `${isImage ? 'Image' : 'Video'} file "${file.originalname}" exceeds the ${limitMB} MB limit`
          );
          err.statusCode = 413;
          throw err;
        }

        // 2. Virus scan (stub – replace in production)
        const scanResult = await scanBuffer(file.buffer, file.originalname);
        if (!scanResult.clean) {
          const err = new Error(
            `File "${file.originalname}" was rejected by virus scanner: ${scanResult.reason || 'infected'}`
          );
          err.statusCode = 400;
          throw err;
        }

        let storageKey, thumbnailKey;

        if (isImage) {
          // 3a. Compress + convert to WebP
          const { buffer: webpBuffer, filename, mimetype } = await processImage(file.buffer);
          storageKey = await uploadBuffer(webpBuffer, 'media', filename, mimetype);
        } else {
          // 3b. Upload video as-is
          const videoExt = path.extname(file.originalname) || '.mp4';
          const videoFilename = `${uuidv4()}${videoExt}`;
          storageKey = await uploadBuffer(file.buffer, 'media', videoFilename, detectedMime);

          // Extract thumbnail (non-fatal)
          const thumb = await extractThumbnail(file.buffer, file.originalname);
          if (thumb) {
            thumbnailKey = await uploadBuffer(
              thumb.buffer,
              'thumbnails',
              thumb.filename,
              thumb.mimetype
            );
          }
        }

        return {
          ...file,
          mediaType: isImage ? 'image' : 'video',
          storageKey,
          thumbnailKey: thumbnailKey || null
        };
      })
    );

    req.files = processed;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = processMedia;
