import { sendMessage } from '../services/telegram.service';
import { queryExpenses } from '../services/expense.service';
import { formatSummary, escapeMarkdown } from '../utils/formatters';
import { logger } from '../utils/logger';

function dateRange(type: 'daily' | 'weekly' | 'monthly'): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  let fromDate: string;

  if (type === 'daily') {
    fromDate = toDate;
  } else if (type === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    fromDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } else {
    // monthly: first day of current month
    fromDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  }

  return { from: fromDate, to: toDate };
}

function parseCommand(text: string): { cmd: string; args: string[] } {
  const parts = text.trim().split(/\s+/);
  const cmd = (parts[0] ?? '').toLowerCase().split('@')[0]; // strip @BotName suffix
  return { cmd, args: parts.slice(1) };
}

export async function handleCommand(
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  const { cmd, args } = parseCommand(text);
  logger.info('Handling command', { cmd, args });

  try {
    switch (cmd) {
      case '/daily': {
        const { from, to } = dateRange('daily');
        const { rows, grandTotal } = await queryExpenses(from, to);
        await sendMessage(
          chatId,
          formatSummary("Today's Expenses", rows, grandTotal),
          'MarkdownV2',
          messageId,
        );
        break;
      }

      case '/weekly': {
        const { from, to } = dateRange('weekly');
        const { rows, grandTotal } = await queryExpenses(from, to);
        await sendMessage(
          chatId,
          formatSummary('Last 7 Days Expenses', rows, grandTotal),
          'MarkdownV2',
          messageId,
        );
        break;
      }

      case '/monthly': {
        const { from, to } = dateRange('monthly');
        const { rows, grandTotal } = await queryExpenses(from, to);
        await sendMessage(
          chatId,
          formatSummary('This Month Expenses', rows, grandTotal),
          'MarkdownV2',
          messageId,
        );
        break;
      }

      case '/category': {
        const categoryName = args.join(' ').trim();
        if (!categoryName) {
          await sendMessage(
            chatId,
            '⚠️ Usage: `/category Food`',
            'MarkdownV2',
            messageId,
          );
          break;
        }

        const { from, to } = dateRange('monthly');
        const { rows, grandTotal } = await queryExpenses(from, to, categoryName);
        await sendMessage(
          chatId,
          formatSummary(
            `${categoryName} — This Month`,
            rows.filter((r) => r.category.toLowerCase() === categoryName.toLowerCase()),
            grandTotal,
          ),
          'MarkdownV2',
          messageId,
        );
        break;
      }

      case '/help': {
        const helpText = [
          '*Expense Tracker Bot*',
          '',
          'Send a photo of a receipt to log an expense automatically\\.',
          '',
          '*Commands:*',
          '`/daily` \u2014 Today\u2019s expenses',
          '`/weekly` — Last 7 days',
          '`/monthly` — This month',
          '`/category \\{name\\}` — Filter by category \\(e\\.g\\. Food\\)',
          '`/help` — Show this message',
        ].join('\n');

        await sendMessage(chatId, helpText, 'MarkdownV2', messageId);
        break;
      }

      default: {
        await sendMessage(
          chatId,
          `Unknown command: \`${escapeMarkdown(cmd)}\`\\. Try /help\\.`,
          'MarkdownV2',
          messageId,
        );
      }
    }
  } catch (err) {
    logger.error('Command handler error', err);
    await sendMessage(
      chatId,
      '⚠️ Something went wrong while processing your command\\. Please try again\\.',
      'MarkdownV2',
      messageId,
    );
  }
}
