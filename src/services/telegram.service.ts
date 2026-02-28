import axios from 'axios';
import { logger } from '../utils/logger';

const BASE_URL = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Download the highest-resolution photo from Telegram's servers.
 * Returns a Buffer of the image bytes.
 */
export async function downloadTelegramPhoto(
  photos: Array<{ file_id: string; width: number; height: number }>,
): Promise<{ buffer: Buffer; fileId: string }> {
  // Telegram sends photos sorted by size ascending; pick the last (largest)
  const largest = photos[photos.length - 1];
  const fileId = largest.file_id;

  logger.info('Fetching file path from Telegram', { fileId });

  // Step 1: Get file path
  const fileRes = await axios.get<{ ok: boolean; result: { file_path: string } }>(
    `${BASE_URL()}/getFile`,
    { params: { file_id: fileId } },
  );

  if (!fileRes.data.ok) {
    throw new Error('Telegram getFile API returned not ok');
  }

  const filePath = fileRes.data.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;

  logger.info('Downloading photo from Telegram', { filePath });

  // Step 2: Download image bytes
  const imageRes = await axios.get<Buffer>(downloadUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(imageRes.data);

  logger.info('Photo downloaded', { bytes: buffer.length });
  return { buffer, fileId };
}

/**
 * Send a text reply to a chat.
 */
export async function sendMessage(
  chatId: number,
  text: string,
  parseMode: 'MarkdownV2' | 'HTML' | 'Markdown' = 'MarkdownV2',
  replyToMessageId?: number,
): Promise<void> {
  try {
    await axios.post(`${BASE_URL()}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      reply_to_message_id: replyToMessageId,
    });
  } catch (err) {
    logger.error('Failed to send Telegram message', err);
  }
}

/**
 * Register the webhook with Telegram.
 */
export async function registerWebhook(webhookUrl: string): Promise<void> {
  logger.info('Registering webhook', { webhookUrl });

  const res = await axios.post<{ ok: boolean; description?: string }>(
    `${BASE_URL()}/setWebhook`,
    { url: webhookUrl },
  );

  if (!res.data.ok) {
    throw new Error(`setWebhook failed: ${res.data.description}`);
  }

  logger.info('Webhook registered successfully');
}
