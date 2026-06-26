import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { SyncLogEntry, DbSyncLog } from '../types';
import { dbToSyncLog, syncLogToDb } from '../types';

export function useSyncLogs() {
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ── 初回ロード ──
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to fetch sync logs:', error);
        setLoading(false);
        return;
      }

      setSyncLogs((data as DbSyncLog[]).map(dbToSyncLog));
      setLoading(false);
    };

    fetchLogs();
  }, []);

  // ── Realtime サブスクリプション ──
  useEffect(() => {
    const channel = supabase
      .channel('sync_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sync_logs' },
        (payload) => {
          const newLog = dbToSyncLog(payload.new as DbSyncLog);
          setSyncLogs(prev => {
            if (prev.some(l => l.id === newLog.id)) return prev;
            return [newLog, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── ログ追加 ──
  const addSyncLog = useCallback(async (log: SyncLogEntry) => {
    const dbRow = syncLogToDb(log);
    const { error: insertError } = await supabase
      .from('sync_logs')
      .insert(dbRow);

    if (insertError) {
      console.error('Failed to add sync log:', insertError);
    }
  }, []);

  return { syncLogs, loading, addSyncLog };
}
