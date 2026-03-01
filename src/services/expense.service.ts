import { supabase } from '../integrations/supabase';
import { logger } from '../utils/logger';
import type { ExtractedExpense } from './extraction.service';
import type { SummaryRow } from '../utils/formatters';

const TABLE = 'expenses';

export interface InsertExpensePayload extends ExtractedExpense {
  image_url: string | null;
  raw_text: string;
}

export async function insertExpense(payload: InsertExpensePayload): Promise<void> {
  logger.info('Inserting expense into DB', { store: payload.store_name });

  const { error } = await supabase.from(TABLE).insert({
    store_name: payload.store_name,
    total_amount: payload.total_amount,
    date: payload.date,
    category: payload.category,
    image_url: payload.image_url,
    raw_text: payload.raw_text,
  });

  if (error) {
    throw new Error(`DB insert failed: ${error.message}`);
  }

  logger.info('Expense inserted successfully');
}

// ---------- Query helpers ----------

interface AggRow {
  category: string;
  total: number;
  count: number;
}

export async function queryExpenses(
  fromDate: string,
  toDate: string,
  category?: string,
): Promise<{ rows: SummaryRow[]; grandTotal: number }> {
  let query = supabase
    .from(TABLE)
    .select('category, total_amount')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (category) {
    query = query.ilike('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`DB query failed: ${error.message}`);
  }

  // Aggregate in-process (Supabase free tier has no rpc aggregation without a function)
  const map = new Map<string, AggRow>();
  let grandTotal = 0;

  for (const row of data ?? []) {
    const cat: string = row.category ?? 'Other';
    const amount: number = Number(row.total_amount) || 0;
    grandTotal += amount;

    if (!map.has(cat)) {
      map.set(cat, { category: cat, total: 0, count: 0 });
    }
    const agg = map.get(cat)!;
    agg.total += amount;
    agg.count += 1;
  }

  const rows: SummaryRow[] = [...map.values()].sort((a, b) => b.total - a.total);

  return { rows, grandTotal };
}
