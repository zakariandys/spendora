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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatExpenseConfirmation(expense: ExpenseRow): string {
  return [
    '✅ <b>Receipt saved!</b>',
    `🏪 Store: ${escapeHtml(expense.store_name)}`,
    `💴 Amount: ¥${expense.total_amount.toLocaleString()}`,
    `📅 Date: ${expense.date}`,
    `🏷️ Category: ${escapeHtml(expense.category)}`,
  ].join('\n');
}

export function formatSummary(
  title: string,
  rows: SummaryRow[],
  grandTotal: number,
): string {
  if (rows.length === 0) {
    return `📊 <b>${escapeHtml(title)}</b>\n\nNo expenses found.`;
  }

  const lines = rows.map((r) => {
    const label = `${r.count} receipt${r.count !== 1 ? 's' : ''}`;
    return `• ${escapeHtml(r.category)}: ¥${r.total.toLocaleString()} (${label})`;
  });

  return [
    `📊 <b>${escapeHtml(title)}</b>`,
    '',
    ...lines,
    '',
    `💰 <b>Total: ¥${grandTotal.toLocaleString()}</b>`,
  ].join('\n');
}

// kept for any remaining callers
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
