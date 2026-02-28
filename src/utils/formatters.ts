export interface ExpenseRow {
  store_name: string;
  total_amount: number;
  date: string;
  category: string;
  image_url: string | null;
}

export interface SummaryRow {
  category: string;
  total: number;
  count: number;
}

export function formatExpenseConfirmation(expense: ExpenseRow): string {
  return [
    '✅ *Receipt saved!*',
    `🏪 Store: ${escapeMarkdown(expense.store_name)}`,
    `💴 Amount: ¥${expense.total_amount.toLocaleString()}`,
    `📅 Date: ${expense.date}`,
    `🏷️ Category: ${escapeMarkdown(expense.category)}`,
  ].join('\n');
}

export function formatSummary(
  title: string,
  rows: SummaryRow[],
  grandTotal: number,
): string {
  if (rows.length === 0) {
    return `📊 *${escapeMarkdown(title)}*\n\nNo expenses found.`;
  }

  const lines = rows.map(
    (r) =>
      `• ${escapeMarkdown(r.category)}: ¥${r.total.toLocaleString()} (${r.count} receipt${r.count !== 1 ? 's' : ''})`,
  );

  return [
    `📊 *${escapeMarkdown(title)}*`,
    '',
    ...lines,
    '',
    `💰 *Total: ¥${grandTotal.toLocaleString()}*`,
  ].join('\n');
}

export function escapeMarkdown(text: string): string {
  // Escape special MarkdownV2 characters
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
