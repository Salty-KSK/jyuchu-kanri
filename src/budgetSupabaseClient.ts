import { createClient } from '@supabase/supabase-js';

// 予算管理システム連携用Supabaseクライアント
// anon keyはフロントエンド公開用のため直接記載（RLSで保護）
const BUDGET_SUPABASE_URL = 'https://wwymcmsyixfgmteyashe.supabase.co';
const BUDGET_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3eW1jbXN5aXhmZ210ZXlhc2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDY0MzEsImV4cCI6MjA5NTkyMjQzMX0.0nb2-kyRF-b9bZE-PlxWQ5AGA86BkFkB-uFyrXBxYRc';

export const budgetSupabase = createClient(BUDGET_SUPABASE_URL, BUDGET_SUPABASE_ANON_KEY);
