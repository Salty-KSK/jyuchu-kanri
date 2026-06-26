// ── 共有型定義 ──
// 全コンポーネントで使用する型をここに集約

export type OrderStatus = "見込み" | "見積中" | "見積提出済" | "受注済" | "施工中" | "完了" | "失注";

export const STATUS_OPTIONS: OrderStatus[] = ["見込み", "見積中", "見積提出済", "受注済", "施工中", "完了", "失注"];

export const statusToCssClass: Record<OrderStatus, string> = {
  見込み: "prospect",
  見積中: "estimating",
  見積提出済: "submitted",
  受注済: "ordered",
  施工中: "in-progress",
  完了: "completed",
  失注: "lost",
};

export interface OrderProject {
  id: string;
  projectName: string;
  clientName: string;
  siteAddress: string;
  estimatedAmount: number;
  orderAmount: number | null;
  status: OrderStatus;
  assignee: string;
  startDate: string;
  endDate: string;
  importedFromSiteList: boolean;
  siteListId: string | null;
  budgetRegistered: boolean;
  budgetRegisteredAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLogEntry {
  id: string;
  projectId: string;
  projectName: string;
  action: string;
  status: "success" | "error";
  timestamp: string;
  message: string;
}

export interface ToastNotification {
  id: string;
  type: "success" | "error" | "warning";
  title: string;
  message: string;
}

export interface SiteListItem {
  id: string;
  projectName: string;
  clientName: string;
  siteAddress: string;
  estimatedAmount: number;
  assignee: string;
  startDate: string;
  endDate: string;
}

// ── Supabase DB行型（snake_case） ──

export interface DbOrderProject {
  id: string;
  project_name: string;
  client_name: string;
  site_address: string;
  estimated_amount: number;
  order_amount: number | null;
  status: string;
  assignee: string;
  start_date: string;
  end_date: string;
  imported_from_site_list: boolean;
  site_list_id: string | null;
  budget_registered: boolean;
  budget_registered_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DbSyncLog {
  id: string;
  project_id: string;
  project_name: string;
  action: string;
  status: string;
  timestamp: string;
  message: string;
}

export interface DbSiteSyncState {
  id: number;
  last_synced_at: string;
  items_synced: number;
  sync_status: string;
}

// ── 変換ユーティリティ ──

export function dbToOrderProject(row: DbOrderProject): OrderProject {
  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name,
    siteAddress: row.site_address,
    estimatedAmount: row.estimated_amount,
    orderAmount: row.order_amount,
    status: row.status as OrderStatus,
    assignee: row.assignee,
    startDate: row.start_date,
    endDate: row.end_date,
    importedFromSiteList: row.imported_from_site_list,
    siteListId: row.site_list_id,
    budgetRegistered: row.budget_registered,
    budgetRegisteredAt: row.budget_registered_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function orderProjectToDb(project: OrderProject): DbOrderProject {
  return {
    id: project.id,
    project_name: project.projectName,
    client_name: project.clientName,
    site_address: project.siteAddress,
    estimated_amount: project.estimatedAmount,
    order_amount: project.orderAmount,
    status: project.status,
    assignee: project.assignee,
    start_date: project.startDate,
    end_date: project.endDate,
    imported_from_site_list: project.importedFromSiteList,
    site_list_id: project.siteListId,
    budget_registered: project.budgetRegistered,
    budget_registered_at: project.budgetRegisteredAt,
    notes: project.notes,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

export function dbToSyncLog(row: DbSyncLog): SyncLogEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    action: row.action,
    status: row.status as "success" | "error",
    timestamp: row.timestamp,
    message: row.message,
  };
}

export function syncLogToDb(log: SyncLogEntry): DbSyncLog {
  return {
    id: log.id,
    project_id: log.projectId,
    project_name: log.projectName,
    action: log.action,
    status: log.status,
    timestamp: log.timestamp,
    message: log.message,
  };
}

// ── ユーティリティ関数 ──

export const formatCurrency = (n: number) => "¥" + new Intl.NumberFormat("ja-JP").format(n);
export const formatDate = (s: string) => s ? new Date(s).toLocaleDateString("ja-JP") : "—";
export const formatDateTime = (s: string) => s ? new Date(s).toLocaleString("ja-JP") : "—";

// ── GAS API 型 ──

export interface GenbaRawData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  projectNo: string;
  orderAmount: string;
  expectedAmount: string;
  status: string;
  department: string;
  person: string;
  assignee: string;
  contractor: string;
  remarks: string;
}
