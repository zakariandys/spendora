import { sendMessage } from '../services/telegram.service';
import { detectIntent, generateChatReply } from '../services/nlp.service';
import { handleCommand } from './command.controller';
import { logger } from '../utils/logger';

export async function handleChat(
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  logger.info('Handling chat message via NLP', { text: text.slice(0, 60) });

  // First check if the message maps to a known report command
  const intent = await detectIntent(text);

  if (intent.cmd) {
    const commandText = intent.cmd === '/category' && intent.category
      ? `/category ${intent.category}`
      : intent.cmd;
    await handleCommand(chatId, messageId, commandText);
    return;
  }

  // No command intent — reply conversationally
  const reply = await generateChatReply(text);
  await sendMessage(chatId, reply, 'HTML', messageId);
}
