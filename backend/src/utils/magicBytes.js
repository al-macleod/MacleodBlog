/**
 * Magic-bytes detector for the file types accepted by BuzzForge.
 *
 * Checks the raw buffer rather than the HTTP Content-Type header so that a
 * client cannot bypass the type filter by lying about the MIME type.
 *
 * Supported types: image/jpeg, image/png, image/gif, image/webp,
 *                  video/mp4, video/webm
 *
 * Returns the detected MIME string or null when the buffer does not match any
 * known signature.
 */

/**
 * @param {Buffer} buf
 * @returns {string|null}
 */
function detectMimeFromBuffer(buf) {
  if (!buf || buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
    buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
  ) {
    return 'image/png';
  }

  // GIF: GIF87a or GIF89a
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) {
    return 'image/gif';
  }

  // WebP: RIFF????WEBP  (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  // MP4 / MOV: look for 'ftyp' box at offset 4 (most common) or offset 0
  // Offset 4–7 should be 66 74 79 70 (ASCII "ftyp")
  if (buf.length >= 8) {
    if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
      return 'video/mp4';
    }
    // Some MP4 files have the ftyp box further in; check offset 0 too
    if (buf[0] === 0x66 && buf[1] === 0x74 && buf[2] === 0x79 && buf[3] === 0x70) {
      return 'video/mp4';
    }
  }

  // WebM / MKV: 1A 45 DF A3
  if (
    buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3
  ) {
    return 'video/webm';
  }

  return null;
}

module.exports = { detectMimeFromBuffer };
