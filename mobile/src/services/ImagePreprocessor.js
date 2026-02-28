/**
 * ImagePreprocessor.js
 *
 * Converts JPEG frames (base64 data-URI or Uint8Array) into raw RGB tensors
 * for TFLite inference. Decodes with jpeg-js and resizes using bilinear
 * interpolation to match the model's expected input dimensions.
 */

import { decode } from 'jpeg-js';

/**
 * Extracts JPEG bytes from a base64 data-URI.
 *
 * @param {string} dataUri - "data:image/jpeg;base64,..." format
 * @returns {Uint8Array} Raw JPEG bytes
 */
function jpegBytesFromDataUri(dataUri) {
  const base64 = dataUri.split(',')[1];
  if (!base64) throw new Error('Invalid data-URI');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes JPEG bytes to raw RGB (no alpha).
 *
 * @param {Uint8Array} jpegBytes - Raw JPEG bytes
 * @returns {{ data: Uint8Array, width: number, height: number }}
 */
function decodeJpegToRgb(jpegBytes) {
  const { data, width, height } = decode(jpegBytes, { useTArray: true, formatAsRGBA: false });
  return { data, width, height };
}

/**
 * Bilinear resize of RGB image to target dimensions.
 *
 * @param {Uint8Array} src - Source RGB data (width * height * 3)
 * @param {number} srcW - Source width
 * @param {number} srcH - Source height
 * @param {number} dstW - Target width
 * @param {number} dstH - Target height
 * @returns {Uint8Array} Resized RGB (dstW * dstH * 3)
 */
function bilinearResizeRgb(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 3);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sx = (dx + 0.5) * xRatio - 0.5;
      const sy = (dy + 0.5) * yRatio - 0.5;
      const sx0 = Math.floor(sx);
      const sy0 = Math.floor(sy);
      const sx1 = Math.min(sx0 + 1, srcW - 1);
      const sy1 = Math.min(sy0 + 1, srcH - 1);
      const fx = sx - sx0;
      const fy = sy - sy0;

      const idx = (dy * dstW + dx) * 3;
      for (let c = 0; c < 3; c++) {
        const p00 = src[(sy0 * srcW + sx0) * 3 + c];
        const p10 = src[(sy0 * srcW + sx1) * 3 + c];
        const p01 = src[(sy1 * srcW + sx0) * 3 + c];
        const p11 = src[(sy1 * srcW + sx1) * 3 + c];
        const top = p00 * (1 - fx) + p10 * fx;
        const bot = p01 * (1 - fx) + p11 * fx;
        dst[idx + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return dst;
}

/**
 * Preprocesses a frame for TFLite input.
 *
 * @param {string|Uint8Array} input - Base64 data-URI (e.g. "data:image/jpeg;base64,...") or raw JPEG Uint8Array
 * @param {number} targetWidth - Model input width (e.g. 320 or 300)
 * @param {number} targetHeight - Model input height (e.g. 320 or 300)
 * @returns {Uint8Array} Flattened RGB tensor of shape [targetHeight * targetWidth * 3]
 */
export function preprocessFrameForTFLite(input, targetWidth = 320, targetHeight = 320) {
  let jpegBytes;
  if (typeof input === 'string') {
    jpegBytes = jpegBytesFromDataUri(input);
  } else if (input instanceof Uint8Array) {
    jpegBytes = input;
  } else {
    throw new Error('Input must be base64 data-URI string or Uint8Array');
  }

  const { data, width, height } = decodeJpegToRgb(jpegBytes);
  return bilinearResizeRgb(data, width, height, targetWidth, targetHeight);
}
