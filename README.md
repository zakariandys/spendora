# Spendora

A Telegram group bot that automatically tracks shared expenses by scanning receipt photos using OCR and AI, then storing them in Supabase.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Telegram Bot Setup](#telegram-bot-setup)
3. [Supabase Setup](#supabase-setup)
4. [Environment Variables](#environment-variables)
5. [Running Locally](#running-locally)
6. [Deploying to Render](#deploying-to-render)
7. [Bot Commands](#bot-commands)
8. [Receipt Photo Flow](#receipt-photo-flow)
9. [Supported Categories](#supported-categories)
10. [Project Structure](#project-structure)

---

## Prerequisites

- Node.js 18+
- A [Telegram bot token](https://core.telegram.org/bots#botfather)
- A [Groq API key](https://console.groq.com) (free)
- A [Supabase](https://supabase.com) project (free tier)
- [ngrok](https://ngrok.com) (for local webhook testing only)

---

## Telegram Bot Setup

### 1. Create the bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the prompts
3. Copy the `TELEGRAM_BOT_TOKEN` you receive

### 2. Disable Privacy Mode

By default Telegram bots cannot read group messages unless mentioned. You must turn this off:

1. In BotFather send `/mybots`
2. Select your bot → **Bot Settings** → **Group Privacy** → **Turn off**

> If you skip this step, the bot will not see photos or commands sent in the group.

### 3. Add the bot to your group

1. Open your Telegram group
2. Add the bot as a member
3. Optionally promote it to admin so it can read all messages

### 4. Find your Group ID

Send any message in the group, then open this URL in your browser:

```
https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
```

Look for `"chat": {"id": -1001234567890}` — the **negative number** is your `GROUP_ID`.

### 5. Verify your webhook (optional)

```
https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

Returns the currently registered webhook URL and any errors.

---

## Supabase Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database schema

Open the **SQL Editor** in your Supabase dashboard and run:

```sql
CREATE TABLE expenses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name   text        NOT NULL,
  total_amount numeric     NOT NULL,
  date         date        NOT NULL,
  category     text        NOT NULL,
  image_url    text,
  raw_text     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date     ON expenses (date);
CREATE INDEX idx_expenses_category ON expenses (category);

-- Disable RLS for development (re-enable with proper policies in production)
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
```

### 3. Create the receipts storage bucket

1. Go to **Storage** → **New bucket**
2. Name it `receipts`
3. Set visibility to **Public**

### 4. Copy your credentials

From **Project Settings → API**, copy:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Environment Variables

Copy the example file and fill in all values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | HTTP port the server listens on (default: `3000`) |
| `TELEGRAM_BOT_TOKEN` | Token from BotFather |
| `TELEGRAM_WEBHOOK_URL` | Public HTTPS URL of this server — no trailing slash |
| `GROUP_ID` | Telegram group chat ID (negative number, e.g. `-1001234567890`) |
| `GROQ_API_KEY` | From [console.groq.com](https://console.groq.com) — free |
| `SUPABASE_URL` | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase project settings (used for DB writes and storage) |

---

## Running Locally

### Install dependencies

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

### Expose the server for webhook testing

Telegram requires a public HTTPS URL to send updates. Use ngrok:

```bash
# Install ngrok
brew install ngrok

# Add your authtoken (one-time setup)
ngrok config add-authtoken <YOUR_NGROK_TOKEN>

# Start tunnel
ngrok http 3000
```

Copy the `https://` URL ngrok gives you and set it in `.env`:

```
TELEGRAM_WEBHOOK_URL=https://abc123.ngrok-free.app
```

Restart the dev server — it registers the webhook with Telegram on every startup.

> **Note:** The ngrok URL changes on every restart (free plan). Update `TELEGRAM_WEBHOOK_URL` and restart `npm run dev` each time.

> **Important:** Never run local dev and Render at the same time — whichever server started last will steal the webhook.

### Health check

```
GET http://localhost:3000/health
```

Returns `{ "status": "ok" }` when the server is running.

### Build for production

```bash
npm run build   # compiles TypeScript → dist/
npm start       # runs compiled output
```

---

## Deploying to Render

### 1. Push your code to GitHub

```bash
git push origin master
```

### 2. Create a Web Service on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository `zakariandys/spendora`
3. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `spendora` |
| **Branch** | `master` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

### 3. Add environment variables

In **Environment**, add all variables from your `.env`:

| Key | Value |
|---|---|
| `PORT` | `3000` |
| `TELEGRAM_BOT_TOKEN` | your token |
| `TELEGRAM_WEBHOOK_URL` | your Render URL (see step 4) |
| `GROUP_ID` | your group ID |
| `GROQ_API_KEY` | your Groq key |
| `SUPABASE_URL` | your Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |

### 4. Set the webhook URL

After deploy, Render gives you a URL like:
```
https://spendora.onrender.com
```

Update `TELEGRAM_WEBHOOK_URL` in Render **Environment**:
```
https://spendora.onrender.com
```

Render auto-restarts — the bot will register the new webhook on boot.

### 5. Verify it's working

```
https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

Should show `"url": "https://spendora.onrender.com/webhook"`.

> **Free tier note:** Render free services sleep after 15 minutes of inactivity. The first message after a cold start may take ~30 seconds. Upgrade to a paid plan or add a keep-alive cron ping for production use.

---

## Bot Commands

Send these commands in the Telegram group:

| Command | What it does |
|---|---|
| `/daily` | Category breakdown of **today's** expenses |
| `/weekly` | Category breakdown of the **last 7 days** |
| `/monthly` | Category breakdown of the **current calendar month** |
| `/category <name>` | Filters this month's expenses by category |
| `/help` | Lists all available commands |

### Example outputs

**`/monthly`**
```
📊 This Month Expenses

• Food: ¥12,400 (8 receipts)
• Transport: ¥3,200 (4 receipts)
• Shopping: ¥8,750 (3 receipts)

💰 Total: ¥24,350
```

**`/category Food`**
```
📊 Food — This Month

• Food: ¥12,400 (8 receipts)

💰 Total: ¥12,400
```

**`/daily`**
```
📊 Today's Expenses

• Food: ¥1,500 (2 receipts)

💰 Total: ¥1,500
```

---

## Receipt Photo Flow

When a member sends a photo in the group, Spendora:

1. **Validates** the message is from the allowed group
2. **Downloads** the highest-resolution version of the photo
3. **Uploads** the image to Supabase Storage and stores the URL
4. **Runs OCR** on the image using Tesseract.js (English + Japanese)
5. **Sends the OCR text** to Groq (`llama-3.3-70b-versatile`) and extracts:
   - Store name
   - Total amount (as a plain number)
   - Date (normalized to `YYYY-MM-DD`)
   - Category (from the supported list)
6. **Saves the expense** to Supabase
7. **Replies to the group** with a confirmation:

```
✅ Receipt saved!
🏪 Store: セブンイレブン
💴 Amount: ¥1,250
📅 Date: 2026-03-08
🏷️ Category: Food
```

If any step fails, the bot replies with a clear error message and does not save a partial record.

---

## Supported Categories

Groq classifies each receipt into one of these categories:

| Category | Examples |
|---|---|
| `Food` | Restaurants, convenience stores, supermarkets, cafes |
| `Transport` | Train, bus, taxi, gas stations |
| `Shopping` | Clothing, electronics, department stores |
| `Entertainment` | Movies, events, games, streaming |
| `Health` | Pharmacy, clinics, gym |
| `Utilities` | Electricity, water, internet, phone |
| `Other` | Anything that doesn't fit above |

---

## Project Structure

```
spendora/
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                          ← Express server entry point
    ├── controllers/
    │   ├── webhook.controller.ts         ← Receives Telegram updates, enforces group guard
    │   ├── receipt.controller.ts         ← Photo → OCR → Groq → DB pipeline
    │   └── command.controller.ts         ← Handles all slash commands
    ├── services/
    │   ├── telegram.service.ts           ← Download photos, send messages, register webhook
    │   ├── ocr.service.ts                ← Tesseract.js wrapper (eng+jpn)
    │   ├── extraction.service.ts         ← Groq structured extraction
    │   ├── storage.service.ts            ← Supabase Storage upload
    │   └── expense.service.ts            ← DB insert and query helpers
    ├── integrations/
    │   ├── supabase.ts                   ← Supabase client (service role)
    │   └── openai.ts                     ← Groq client (OpenAI-compatible)
    └── utils/
        ├── logger.ts                     ← Structured console logger
        └── formatters.ts                 ← Telegram HTML message formatters
```
