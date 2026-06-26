-- =============================================
-- 受注工事管理表 Supabase スキーマ
-- Supabase SQL Editor で実行してください
-- =============================================

-- 受注工事プロジェクト
CREATE TABLE order_projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  site_address TEXT DEFAULT '',
  estimated_amount BIGINT DEFAULT 0,
  order_amount BIGINT,
  status TEXT NOT NULL DEFAULT '見込み',
  assignee TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  imported_from_site_list BOOLEAN DEFAULT FALSE,
  site_list_id TEXT,
  budget_registered BOOLEAN DEFAULT FALSE,
  budget_registered_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 同期ログ
CREATE TABLE sync_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  project_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  message TEXT DEFAULT ''
);

-- 現場一覧 同期状態トラッキング
CREATE TABLE site_sync_state (
  id SERIAL PRIMARY KEY,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  items_synced INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'idle'
);

-- 初期行（同期状態の追跡用）
INSERT INTO site_sync_state (sync_status) VALUES ('idle');

-- =============================================
-- Realtime有効化
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE order_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE site_sync_state;

-- =============================================
-- RLS (Row Level Security)
-- 社内ツールのため、anon keyでの全操作を許可
-- =============================================
ALTER TABLE order_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON order_projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON sync_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON site_sync_state
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- updated_at 自動更新トリガー
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON order_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- インデックス（パフォーマンス最適化）
-- =============================================
CREATE INDEX idx_order_projects_status ON order_projects(status);
CREATE INDEX idx_order_projects_site_list_id ON order_projects(site_list_id);
CREATE INDEX idx_order_projects_updated_at ON order_projects(updated_at DESC);
CREATE INDEX idx_sync_logs_project_id ON sync_logs(project_id);
CREATE INDEX idx_sync_logs_timestamp ON sync_logs(timestamp DESC);
