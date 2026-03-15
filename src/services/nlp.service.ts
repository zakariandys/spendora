import { openai } from '../integrations/openai';
import { logger } from '../utils/logger';

export interface NlpIntent {
  cmd: '/daily' | '/weekly' | '/monthly' | '/category' | null;
  category?: string; // only when cmd === '/category'
}

const SYSTEM_PROMPT = `You are an intent classifier for a group expense tracking bot.
Given a user message in any language, determine which report command the user wants.

Respond with ONLY a JSON object — no explanation, no markdown.

Commands available:
- /daily   → expenses for today
- /weekly  → expenses for the last 7 days
- /monthly → expenses for this month (billing cycle)
- /category → expenses filtered by category (extract the category name from the message)
- null     → message is not asking for any expense report

Category names: Groceries, Dining, Shopping, Transport, Utilities, Health, Entertainment, Other

Examples:
User: "kasih laporan bulanan dong" → {"cmd":"/monthly"}
User: "pengeluaran hari ini berapa?" → {"cmd":"/daily"}
User: "show food expenses" → {"cmd":"/category","category":"Food"}
User: "weekly report please" → {"cmd":"/weekly"}
User: "halo semua" → {"cmd":null}
User: "berapa pengeluaran transport bulan ini?" → {"cmd":"/category","category":"Transport"}`;

const CHAT_SYSTEM_PROMPT = `You are Spendora, a friendly expense tracking bot for a group chat.
You help users track expenses by scanning receipts and generating reports.
Reply briefly and naturally in the same language the user is using.
Do not make up expense data. If asked about reports, tell the user to use the commands or just ask naturally.`;

export async function generateChatReply(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 200,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    });

    return response.choices[0]?.message?.content?.trim() ?? 'Maaf, saya tidak mengerti. Coba kirim foto struk atau ketik /help.';
  } catch (err) {
    logger.warn('Chat reply generation failed', err);
    return 'Maaf, ada error. Coba lagi ya!';
  }
}

export async function detectIntent(text: string): Promise<NlpIntent> {
  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 60,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    logger.info('NLP raw response', { raw });

    const parsed = JSON.parse(raw) as NlpIntent;
    return parsed;
  } catch (err) {
    logger.warn('NLP intent detection failed', err);
    return { cmd: null };
  }
}
