import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  throw new Error('Missing GROQ_API_KEY env var');
}

// Groq is OpenAI-API compatible — reuse the OpenAI SDK with a custom baseURL
export const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});
