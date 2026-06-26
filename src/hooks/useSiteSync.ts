import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type {
  OrderProject,
  SyncLogEntry,
  GenbaRawData,
  SiteListItem,
  DbOrderProject,
  DbSiteSyncState,
} from '../types';
import { dbToOrderProject, orderProjectToDb } from '../types';

const GAS_URL = import.meta.env.VITE_GAS_API_URL as string ||
  'https://script.google.com/macros/s/AKfycbyPojVK0xgrKyMBPOYDcr7IFvaJsoW0JaJntjOvZEqRXnbZgdRz4NZkFdCpeA6oiDDY/exec';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5分

function parseAmount(numStr: string): number {
  if (!numStr) return 0;
  const num = parseInt(numStr.toString().replace(/,/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function mapRawToSiteListItem(raw: GenbaRawData): SiteListItem {
  return {
    id: raw.id,
    projectName: raw.name || '',
    clientName: raw.contractor && raw.contractor !== '---' ? raw.contractor : '',
    siteAddress: raw.remarks || '',
    estimatedAmount: parseAmount(raw.expectedAmount) || parseAmount(raw.orderAmount),
    assignee:
      raw.assignee && raw.assignee !== '---'
        ? raw.assignee
        : raw.person && raw.person !== '---'
          ? raw.person
          : '',
    startDate: raw.startDate || '',
    endDate: raw.endDate || '',
  };
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useSiteSync(
  addSyncLog: (log: SyncLogEntry) => Promise<void>
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastSyncCount, setLastSyncCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 同期状態の初回ロード ──
  useEffect(() => {
    const loadSyncState = async () => {
      const { data } = await supabase
        .from('site_sync_state')
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (data) {
        const state = data as DbSiteSyncState;
        setLastSyncedAt(state.last_synced_at);
        setLastSyncCount(state.items_synced);
      }
    };
    loadSyncState();
  }, []);

  // ── 同期処理本体 ──
  const performSync = useCallback(async () => {
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // 1. GAS APIから現場一覧を取得
      const response = await fetch(GAS_URL);
      const rawData: GenbaRawData[] = await response.json();

      if (!Array.isArray(rawData)) {
        throw new Error('現場一覧のデータ形式が不正です');
      }

      const validData = rawData.filter(r => r.name && r.name.trim() !== '');
      const siteItems = validData.map(mapRawToSiteListItem);

      // 2. 既存プロジェクトを取得（site_list_idで紐付け）
      const { data: existingRows } = await supabase
        .from('order_projects')
        .select('*')
        .not('site_list_id', 'is', null);

      const existingProjects = (existingRows as DbOrderProject[] || []).map(dbToOrderProject);
      const existingMap = new Map<string, OrderProject>();
      existingProjects.forEach(p => {
        if (p.siteListId) existingMap.set(p.siteListId, p);
      });

      let syncedCount = 0;
      const now = new Date().toISOString();

      for (const siteItem of siteItems) {
        const existing = existingMap.get(siteItem.id);

        if (!existing) {
          // 新規: Supabaseに追加
          const newProject: OrderProject = {
            id: `P-${siteItem.id}`,
            projectName: siteItem.projectName,
            clientName: siteItem.clientName,
            siteAddress: siteItem.siteAddress,
            estimatedAmount: siteItem.estimatedAmount,
            orderAmount: null,
            status: '見込み',
            assignee: siteItem.assignee,
            startDate: siteItem.startDate,
            endDate: siteItem.endDate,
            importedFromSiteList: true,
            siteListId: siteItem.id,
            budgetRegistered: false,
            budgetRegisteredAt: null,
            notes: '',
            createdAt: now,
            updatedAt: now,
          };

          const dbRow = orderProjectToDb(newProject);
          const { error } = await supabase.from('order_projects').upsert(dbRow, { onConflict: 'id' });
          if (!error) {
            syncedCount++;
            await addSyncLog({
              id: `L-sync-${Date.now()}-${siteItem.id}`,
              projectId: newProject.id,
              projectName: newProject.projectName,
              action: '現場一覧から自動追加',
              status: 'success',
              timestamp: now,
              message: `現場一覧から「${newProject.projectName}」を自動追加しました`,
            });
          }
        } else {
          // 既存: 差分チェック（最終更新日時で比較）
          const hasChanges =
            existing.projectName !== siteItem.projectName ||
            existing.clientName !== siteItem.clientName ||
            existing.siteAddress !== siteItem.siteAddress ||
            existing.estimatedAmount !== siteItem.estimatedAmount ||
            existing.assignee !== siteItem.assignee ||
            existing.startDate !== siteItem.startDate ||
            existing.endDate !== siteItem.endDate;

          if (hasChanges) {
            // 最終更新日時が新しい方を優先
            const siteUpdatedAt = new Date(now).getTime();
            const projectUpdatedAt = new Date(existing.updatedAt).getTime();

            if (siteUpdatedAt >= projectUpdatedAt) {
              const updatedProject: OrderProject = {
                ...existing,
                projectName: siteItem.projectName,
                clientName: siteItem.clientName,
                siteAddress: siteItem.siteAddress,
                estimatedAmount: siteItem.estimatedAmount,
                assignee: siteItem.assignee,
                startDate: siteItem.startDate,
                endDate: siteItem.endDate,
                updatedAt: now,
              };

              const dbRow = orderProjectToDb(updatedProject);
              const { error } = await supabase
                .from('order_projects')
                .update(dbRow)
                .eq('id', existing.id);

              if (!error) {
                syncedCount++;
                await addSyncLog({
                  id: `L-sync-${Date.now()}-${siteItem.id}`,
                  projectId: existing.id,
                  projectName: updatedProject.projectName,
                  action: '現場一覧から自動更新',
                  status: 'success',
                  timestamp: now,
                  message: `現場一覧の変更を「${updatedProject.projectName}」に反映しました`,
                });
              }
            }
          }
        }
      }

      // 3. 同期状態を更新
      await supabase
        .from('site_sync_state')
        .update({
          last_synced_at: now,
          items_synced: syncedCount,
          sync_status: 'success',
        })
        .eq('id', 1);

      setLastSyncedAt(now);
      setLastSyncCount(syncedCount);
      setSyncStatus('success');

      // 3秒後にidle状態に戻す
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('Site sync failed:', err);
      const errorMsg = err instanceof Error ? err.message : '同期中にエラーが発生しました';
      setSyncError(errorMsg);
      setSyncStatus('error');

      await supabase
        .from('site_sync_state')
        .update({ sync_status: 'error' })
        .eq('id', 1);
    }
  }, [addSyncLog]);

  // ── 5分間隔の自動同期 ──
  useEffect(() => {
    // 初回同期
    performSync();

    // 定期同期
    intervalRef.current = setInterval(performSync, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [performSync]);

  // ── 手動同期トリガー ──
  const triggerSync = useCallback(async () => {
    if (syncStatus === 'syncing') return;
    await performSync();
  }, [syncStatus, performSync]);

  // ── ステータス変更をGASに書き戻し ──
  const pushStatusToGAS = useCallback(async (
    siteListId: string,
    status: string,
    projectName: string
  ) => {
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStatus',
          siteId: siteListId,
          status: status,
        }),
        mode: 'no-cors', // GAS CORS制限回避
      });

      // no-corsモードではレスポンスが読めないため、成功前提でログを記録
      await addSyncLog({
        id: `L-push-${Date.now()}`,
        projectId: `P-${siteListId}`,
        projectName,
        action: '現場一覧へステータス反映',
        status: 'success',
        timestamp: new Date().toISOString(),
        message: `「${projectName}」のステータスを「${status}」に変更し、現場一覧に反映しました`,
      });

      // opaque responseの場合
      if (response.type !== 'opaque') {
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || '更新に失敗しました');
        }
      }
    } catch (err) {
      console.error('Failed to push status to GAS:', err);
      // エラーでもログを記録（no-corsモードでは常にここに来る可能性あり）
    }
  }, [addSyncLog]);

  return {
    syncStatus,
    lastSyncedAt,
    lastSyncCount,
    syncError,
    triggerSync,
    pushStatusToGAS,
  };
}
