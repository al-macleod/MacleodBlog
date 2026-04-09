const multer = require('multer');

// Files are kept in memory so the processMedia middleware can validate their
// magic bytes, compress images, extract video thumbnails, and upload them to
// S3/R2 (or the local uploads directory) before any bytes are written to disk.
const storage = multer.memoryStorage();

// First-pass MIME filter based on the Content-Type header declared by the
// client.  Magic-bytes validation in processMedia provides a second, stronger
// check against spoofed MIME types.
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm'
]);

const IMAGE_MAX_SIZE = parseInt(process.env.MAX_IMAGE_SIZE, 10) || 10485760; // 10 MB
const VIDEO_MAX_SIZE = parseInt(process.env.MAX_VIDEO_SIZE, 10) || 104857600; // 100 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    return cb(
      new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, MP4, and WebM are allowed.')
    );
  }
  cb(null, true);
};

// Use the larger of the two per-type limits as the global multer cap.
// Per-type enforcement happens inside processMedia.
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(IMAGE_MAX_SIZE, VIDEO_MAX_SIZE)
  }
});

module.exports = { upload, IMAGE_MAX_SIZE, VIDEO_MAX_SIZE };
