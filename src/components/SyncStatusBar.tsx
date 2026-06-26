import type { SyncStatus } from '../hooks/useSiteSync';

interface SyncStatusBarProps {
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  lastSyncCount: number;
  syncError: string | null;
  onSync: () => void;
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

export default function SyncStatusBar({
  syncStatus,
  lastSyncedAt,
  lastSyncCount,
  syncError,
  onSync,
}: SyncStatusBarProps) {
  const isSyncing = syncStatus === 'syncing';

  return (
    <div className={`sync-status-bar ${syncStatus}`}>
      <div className="sync-status-left">
        <span
          className={`material-symbols-outlined sync-status-icon ${isSyncing ? 'spinning' : ''}`}
          style={{
            color:
              syncStatus === 'error'
                ? 'var(--google-red)'
                : syncStatus === 'success'
                  ? 'var(--google-green)'
                  : isSyncing
                    ? 'var(--google-primary)'
                    : 'var(--google-text-sub)',
          }}
        >
          {syncStatus === 'error'
            ? 'cloud_off'
            : syncStatus === 'success'
              ? 'cloud_done'
              : isSyncing
                ? 'sync'
                : 'cloud_sync'}
        </span>

        <div className="sync-status-text">
          {isSyncing && <span>現場一覧と同期中...</span>}
          {syncStatus === 'success' && (
            <span>
              同期完了
              {lastSyncCount > 0 && ` (${lastSyncCount}件更新)`}
            </span>
          )}
          {syncStatus === 'error' && (
            <span style={{ color: 'var(--google-red)' }}>
              同期エラー{syncError && `：${syncError}`}
            </span>
          )}
          {syncStatus === 'idle' && lastSyncedAt && (
            <span>最終同期: {getRelativeTime(lastSyncedAt)}</span>
          )}
          {syncStatus === 'idle' && !lastSyncedAt && (
            <span>未同期</span>
          )}
        </div>
      </div>

      <button
        className="sync-status-btn"
        onClick={onSync}
        disabled={isSyncing}
        title="手動同期"
      >
        <span
          className={`material-symbols-outlined ${isSyncing ? 'spinning' : ''}`}
          style={{ fontSize: 18 }}
        >
          refresh
        </span>
        {!isSyncing && <span className="sync-btn-label">同期</span>}
      </button>
    </div>
  );
}
