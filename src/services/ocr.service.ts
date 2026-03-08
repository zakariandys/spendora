import Tesseract from 'tesseract.js';
import { logger } from '../utils/logger';

const CONFIDENCE_THRESHOLD = 50;

/**
 * Runs OCR on a local file path or a URL buffer.
 * Supports English + Japanese for typical Japanese receipts.
 * Throws if the result is empty or confidence is below threshold.
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

  const confidence = data.confidence;
  logger.info('OCR completed', { chars: text.length, confidence });

  if (confidence < CONFIDENCE_THRESHOLD) {
    throw new Error(
      `OCR confidence too low (${confidence}%) — please send a clearer photo`,
    );
  }

  return text;
}
