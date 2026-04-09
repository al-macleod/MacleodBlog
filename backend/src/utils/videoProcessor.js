const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

/**
 * Extract a single frame thumbnail from a video buffer.
 *
 * Uses fluent-ffmpeg which requires ffmpeg to be installed on the host.
 * If extraction fails for any reason (ffmpeg not installed, corrupt video,
 * etc.) the function returns null — thumbnail extraction is intentionally
 * non-fatal.
 *
 * @param {Buffer} videoBuffer
 * @param {string} originalFilename  Used only to derive the file extension.
 * @returns {Promise<{ buffer: Buffer, filename: string, mimetype: string }|null>}
 */
async function extractThumbnail(videoBuffer, originalFilename) {
  const tmpDir = os.tmpdir();
  const ext = path.extname(originalFilename) || '.mp4';
  const tmpVideo = path.join(tmpDir, `${uuidv4()}${ext}`);
  const thumbFilename = `${uuidv4()}.jpg`;
  const tmpThumb = path.join(tmpDir, thumbFilename);

  try {
    await writeFile(tmpVideo, videoBuffer);

    await new Promise((resolve, reject) => {
      ffmpeg(tmpVideo)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: path.basename(tmpThumb),
          folder: path.dirname(tmpThumb),
          size: '640x?'
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const thumbBuffer = await readFile(tmpThumb);

    return {
      buffer: thumbBuffer,
      filename: thumbFilename,
      mimetype: 'image/jpeg'
    };
  } catch (err) {
    // Non-fatal: log a warning and continue without a thumbnail.
    console.warn('Video thumbnail extraction failed:', err.message);
    return null;
  } finally {
    for (const tmp of [tmpVideo, tmpThumb]) {
      unlink(tmp).catch(() => {});
    }
  }
}

module.exports = { extractThumbnail };
