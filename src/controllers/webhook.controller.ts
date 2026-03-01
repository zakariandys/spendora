import type { Request, Response } from 'express';
import { handlePhotoMessage } from './receipt.controller';
import { handleCommand } from './command.controller';
import { logger } from '../utils/logger';

const ALLOWED_GROUP_ID = () => {
  const id = process.env.GROUP_ID;
  if (!id) throw new Error('GROUP_ID env var is not set');
  return Number(id);
};

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; username?: string };
  text?: string;
  photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
}

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  // Always acknowledge immediately so Telegram doesn't retry
  res.sendStatus(200);

  const update = req.body as TelegramUpdate;
  const message = update.message;

  if (!message) return;

  const chatId = message.chat.id;

  // Ignore messages from any chat other than the allowed group
  if (chatId !== ALLOWED_GROUP_ID()) {
    logger.warn('Ignored message from unauthorized chat', { chatId });
    return;
  }

  logger.info('Received update', {
    updateId: update.update_id,
    chatId,
    hasPhoto: !!message.photo,
    text: message.text?.slice(0, 60),
  });

  try {
    if (message.photo && message.photo.length > 0) {
      await handlePhotoMessage(message.chat.id, message.message_id, message.photo);
      return;
    }

    if (message.text?.startsWith('/')) {
      await handleCommand(message.chat.id, message.message_id, message.text);
      return;
    }
  } catch (err) {
    logger.error('Unhandled error in webhook controller', err);
  }
}
