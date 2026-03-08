import 'dotenv/config';
import express from 'express';
import { webhookHandler } from './controllers/webhook.controller';
import { registerWebhook } from './services/telegram.service';
import { logger } from './utils/logger';

// Validate required env vars at startup
const REQUIRED_ENV = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_URL',
  'GROUP_ID',
  'GROQ_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL!;

const app = express();

// Parse JSON bodies from Telegram
app.use(express.json());

// Health check — used by Render to confirm the service is up
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Telegram webhook endpoint
app.post('/webhook', webhookHandler);

app.listen(PORT, async () => {
  logger.info(`Server listening on port ${PORT}`);

  try {
    await registerWebhook(`${WEBHOOK_URL}/webhook`);
  } catch (err) {
    logger.error('Failed to register webhook at startup', err);
    // Don't exit — webhook may already be set from a previous deploy
  }
});
