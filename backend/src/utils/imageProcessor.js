const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const IMAGE_QUALITY = 80;
const MAX_DIMENSION = 2048; // px – longest edge

/**
 * Compress an image and convert it to WebP format.
 *
 * @param {Buffer} buffer  Raw image buffer (JPEG / PNG / GIF / WebP / …).
 * @returns {Promise<{ buffer: Buffer, filename: string, mimetype: string }>}
 */
async function processImage(buffer) {
  const filename = `${uuidv4()}.webp`;

  const processedBuffer = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: IMAGE_QUALITY })
    .toBuffer();

  return {
    buffer: processedBuffer,
    filename,
    mimetype: 'image/webp'
  };
}

module.exports = { processImage };
