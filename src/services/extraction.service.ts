import { openai } from '../integrations/openai';
import { logger } from '../utils/logger';

export interface ExtractedExpense {
  store_name: string;
  total_amount: number;
  date: string;       // YYYY-MM-DD
  category: string;
}

const TODAY = () => new Date().toISOString().split('T')[0];

const SYSTEM_PROMPT = `You are a receipt data extractor.
Extract expense information from OCR text and return ONLY a valid JSON object.
No explanation, no markdown, no code fences — raw JSON only.

Required schema:
{
  "store_name": "string (name of the store or merchant)",
  "total_amount": number (the final total as a plain number, no currency symbols),
  "date": "YYYY-MM-DD (normalize to this format; use today if missing)",
  "category": "string (one of: Food, Transport, Shopping, Entertainment, Health, Utilities, Other)"
}

Rules:
- total_amount must be a number (e.g. 1500, not "¥1,500")
- date must be YYYY-MM-DD format
- If date is missing or unclear, use today's date
- category must be chosen from the allowed list
- store_name should be cleaned up (no extra whitespace)`;

export async function extractExpenseFromText(ocrText: string): Promise<ExtractedExpense> {
  logger.info('Sending OCR text to OpenAI for extraction');

  const userMessage = `Today's date: ${TODAY()}\n\nOCR Text:\n${ocrText}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0,
    max_tokens: 300,
  });

  const raw = response.choices[0]?.message?.content?.trim();

  if (!raw) {
    throw new Error('OpenAI returned an empty response');
  }

  logger.info('OpenAI raw response', { raw });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`OpenAI response is not valid JSON: ${raw}`);
  }

  return validateExtraction(parsed);
}

function validateExtraction(data: unknown): ExtractedExpense {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Extraction result is not an object');
  }

  const d = data as Record<string, unknown>;

  if (typeof d.store_name !== 'string' || !d.store_name.trim()) {
    throw new Error('Missing or invalid store_name');
  }

  const amount = Number(d.total_amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid total_amount: ${d.total_amount}`);
  }

  if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
    throw new Error(`Invalid date format: ${d.date}`);
  }

  if (typeof d.category !== 'string' || !d.category.trim()) {
    throw new Error('Missing or invalid category');
  }

  return {
    store_name: (d.store_name as string).trim(),
    total_amount: amount,
    date: d.date as string,
    category: (d.category as string).trim(),
  };
}
