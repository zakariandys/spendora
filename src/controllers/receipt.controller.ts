import { downloadTelegramPhoto, sendMessage } from '../services/telegram.service';
import { runOcr } from '../services/ocr.service';
import { extractExpenseFromText } from '../services/extraction.service';
import { uploadReceiptImage } from '../services/storage.service';
import { insertExpense } from '../services/expense.service';
import { formatExpenseConfirmation } from '../utils/formatters';
import { logger } from '../utils/logger';

interface PhotoSize {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export async function handlePhotoMessage(
  chatId: number,
  messageId: number,
  photos: PhotoSize[],
): Promise<void> {
  logger.info('Processing photo message', { chatId, messageId });

  let buffer: Buffer;
  let fileId: string;

  // 1. Download image from Telegram
  try {
    ({ buffer, fileId } = await downloadTelegramPhoto(photos));
  } catch (err) {
    logger.error('Failed to download photo', err);
    await sendMessage(
      chatId,
      '⚠️ Could not download the photo. Please try again.',
      'HTML',
      messageId,
    );
    return;
  }

  // 2. Upload to Supabase Storage
  let imageUrl: string | null = null;
  try {
    const fileName = `${Date.now()}_${fileId}.jpg`;
    imageUrl = await uploadReceiptImage(buffer, fileName);
  } catch (err) {
    logger.error('Storage upload failed (continuing without image URL)', err);
    // Non-fatal: we still process the receipt even if storage fails
  }

  // 3. OCR
  let ocrText: string;
  try {
    ocrText = await runOcr(buffer);
  } catch (err) {
    logger.error('OCR failed', err);
    await sendMessage(
      chatId,
      '⚠️ Could not read the receipt image. Please ensure the photo is clear and try again.',
      'HTML',
      messageId,
    );
    return;
  }

  // 4. Extract structured data via OpenAI
  let extracted;
  try {
    extracted = await extractExpenseFromText(ocrText);
  } catch (err) {
    logger.error('Extraction failed', err);
    await sendMessage(
      chatId,
      '⚠️ Could not extract expense details from the receipt. Please add the expense manually.',
      'HTML',
      messageId,
    );
    return;
  }

  // 5. Insert into DB
  try {
    await insertExpense({ ...extracted, image_url: imageUrl, raw_text: ocrText });
  } catch (err) {
    logger.error('DB insert failed', err);
    await sendMessage(
      chatId,
      '⚠️ Expense was read but could not be saved. Please try again.',
      'HTML',
      messageId,
    );
    return;
  }

  // 6. Confirm to group
  const expenseRow = { ...extracted, image_url: imageUrl };
  await sendMessage(
    chatId,
    formatExpenseConfirmation(expenseRow),
    'HTML',
    messageId,
  );
}
