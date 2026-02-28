import Tesseract from 'tesseract.js';
import { logger } from '../utils/logger';

/**
 * Runs OCR on a local file path or a URL buffer.
 * Supports English + Japanese for typical Japanese receipts.
 */
export async function runOcr(imageInput: string | Buffer): Promise<string> {
  logger.info('Starting OCR processing');

  const { data } = await Tesseract.recognize(imageInput, 'eng+jpn', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        logger.info(`OCR progress: ${Math.round((m.progress ?? 0) * 100)}%`);
      }
    },
  });

  const text = data.text.trim();

  if (!text) {
    throw new Error('OCR returned empty text — image may be unreadable');
  }

  logger.info('OCR completed', { chars: text.length });
  return text;
}
