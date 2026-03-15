import { updateExpenseCategory } from '../services/expense.service';
import { answerCallbackQuery, editMessageText } from '../services/telegram.service';
import { logger } from '../utils/logger';

interface CallbackQuery {
  id: string;
  message?: { message_id: number; chat: { id: number }; text?: string };
  data?: string;
}

export async function handleCallbackQuery(query: CallbackQuery): Promise<void> {
  const { id, data, message } = query;

  if (!data?.startsWith('edit_cat:')) {
    await answerCallbackQuery(id);
    return;
  }

  // callback_data format: edit_cat:<expenseId>:<category>
  const parts = data.split(':');
  const expenseId = parts[1];
  const newCategory = parts[2];

  if (!expenseId || !newCategory) {
    await answerCallbackQuery(id, '⚠️ Invalid data.');
    return;
  }

  logger.info('Editing expense category via callback', { expenseId, newCategory });

  try {
    await updateExpenseCategory(expenseId, newCategory);
  } catch (err) {
    logger.error('Failed to update expense category', err);
    await answerCallbackQuery(id, '⚠️ Failed to update. Please try again.');
    return;
  }

  // Dismiss the loading spinner on the button
  await answerCallbackQuery(id, `✅ Category updated to ${newCategory}`);

  // Edit the original confirmation message to reflect the change
  if (message) {
    const updatedText = (message.text ?? '')
      .replace(/🏷️ Category: .+/m, `🏷️ Category: ${newCategory}`)
      .replace(/\n<i>Wrong category\? Tap to fix:<\/i>/, '');
    await editMessageText(message.chat.id, message.message_id, updatedText);
  }
}
