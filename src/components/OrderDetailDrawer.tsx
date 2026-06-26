import type { OrderProject, OrderStatus, SyncLogEntry } from "../types";
import { STATUS_OPTIONS, statusToCssClass, formatCurrency, formatDate, formatDateTime } from "../types";

interface OrderDetailDrawerProps {
  isOpen: boolean;
  project: OrderProject | null;
  onClose: () => void;
  onStatusChange: (projectId: string, newStatus: OrderStatus) => void;
  onEdit: (project: OrderProject) => void;
  onDelete: (projectId: string) => void;
  syncLogs: SyncLogEntry[];
}

export default function OrderDetailDrawer({ isOpen, project, onClose, onStatusChange, onEdit, onDelete, syncLogs }: OrderDetailDrawerProps) {
  if (!isOpen || !project) return null;

  const projectLogs = syncLogs.filter(l => l.projectId === project.id);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-header">
          <h2 className="drawer-title">
            <span className="material-symbols-outlined" style={{ color: "var(--google-primary)" }}>info</span>
            工事詳細
          </h2>
          <button className="modal-close" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="drawer-body">
          {/* Project Name */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{project.projectName}</h3>
            <span className={`status-badge ${statusToCssClass[project.status]}`}>{project.status}</span>
            {project.importedFromSiteList && (
              <span className="status-badge info" style={{ marginLeft: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>現場リスト連携
              </span>
            )}
          </div>

          {/* Status Change */}
          <div style={{ marginBottom: 24 }}>
            <label className="form-label">ステータス変更</label>
            <select className="form-select" value={project.status} onChange={e => onStatusChange(project.id, e.target.value as OrderStatus)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Detail Grid */}
          <div className="detail-grid" style={{ marginBottom: 24 }}>
            <div className="detail-item">
              <span className="detail-label">顧客名</span>
              <span className="detail-value">{project.clientName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">担当者</span>
              <span className="detail-value">{project.assignee}</span>
            </div>
            <div className="detail-item full-width">
              <span className="detail-label">現場住所</span>
              <span className="detail-value">{project.siteAddress}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">見積金額</span>
              <span className="detail-value">{formatCurrency(project.estimatedAmount)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">受注金額</span>
              <span className="detail-value">{project.orderAmount !== null ? formatCurrency(project.orderAmount) : "—"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">着工予定日</span>
              <span className="detail-value">{formatDate(project.startDate)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">完工予定日</span>
              <span className="detail-value">{formatDate(project.endDate)}</span>
            </div>
            {project.notes && (
              <div className="detail-item full-width">
                <span className="detail-label">備考</span>
                <span className="detail-value" style={{ whiteSpace: "pre-wrap" }}>{project.notes}</span>
              </div>
            )}
          </div>

          {/* Budget Sync */}
          <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: project.budgetRegistered ? "#E6F4EA" : "#FEF7E0", border: `1px solid ${project.budgetRegistered ? "#CEEAD6" : "#FEEFC3"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: project.budgetRegistered ? "var(--google-green)" : "#B06000" }}>
                {project.budgetRegistered ? "check_circle" : "schedule"}
              </span>
              <span style={{ fontWeight: 600, fontSize: 13, color: project.budgetRegistered ? "#137333" : "#B06000" }}>
                {project.budgetRegistered ? "予算管理システム登録済み" : "予算管理システム未登録"}
              </span>
            </div>
            {project.budgetRegisteredAt && (
              <span style={{ fontSize: 12, color: "var(--google-text-sub)" }}>登録日時: {formatDateTime(project.budgetRegisteredAt)}</span>
            )}
          </div>

          {/* Sync Logs */}
          {projectLogs.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync</span>連携ログ
              </h4>
              <div className="sync-timeline">
                {projectLogs.map((log, idx) => (
                  <div key={log.id} className="sync-timeline-item">
                    <div className="sync-timeline-dot-wrap">
                      <div className={`sync-timeline-dot ${log.status}`} />
                      {idx < projectLogs.length - 1 && <div className="sync-timeline-line" />}
                    </div>
                    <div className="sync-timeline-content">
                      <div className="sync-timeline-title">{log.action}</div>
                      <div className="sync-timeline-time">{formatDateTime(log.timestamp)}</div>
                      <div style={{ fontSize: 12, color: "var(--google-text-sub)", marginTop: 2 }}>{log.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div style={{ fontSize: 11, color: "var(--google-text-sub)", borderTop: "1px solid var(--google-border-light)", paddingTop: 16 }}>
            <div>作成日: {formatDateTime(project.createdAt)}</div>
            <div>更新日: {formatDateTime(project.updatedAt)}</div>
            <div>ID: {project.id}</div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn-danger btn-sm" onClick={() => { if (window.confirm(`「${project.projectName}」を削除しますか？`)) onDelete(project.id); }}>
            <span className="material-symbols-outlined btn-icon">delete</span>削除
          </button>
          <button className="btn-secondary btn-sm" onClick={() => onEdit(project)}>
            <span className="material-symbols-outlined btn-icon">edit</span>編集
          </button>
        </div>
      </div>
    </>
  );
}
