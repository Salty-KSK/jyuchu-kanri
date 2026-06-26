import { createClient } from '@supabase/supabase-js';

const budgetUrl = import.meta.env.VITE_BUDGET_SUPABASE_URL as string;
const budgetKey = import.meta.env.VITE_BUDGET_SUPABASE_ANON_KEY as string;

export const budgetSupabase = budgetUrl && budgetKey
  ? createClient(budgetUrl, budgetKey)
  : null;
