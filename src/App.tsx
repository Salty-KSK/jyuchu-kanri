import { useState, useMemo, useCallback } from "react";
import SiteImportModal from "./components/SiteImportModal";
import OrderFormModal from "./components/OrderFormModal";
import BudgetSyncNotification from "./components/BudgetSyncNotification";
import OrderDetailDrawer from "./components/OrderDetailDrawer";

// ── Types ──
export type OrderStatus = "見込み" | "見積中" | "見積提出済" | "受注済" | "施工中" | "完了" | "失注";

export interface OrderProject {
  id: string; projectName: string; clientName: string; siteAddress: string;
  estimatedAmount: number; orderAmount: number | null; status: OrderStatus;
  assignee: string; startDate: string; endDate: string; importedFromSiteList: boolean;
  siteListId: string | null; budgetRegistered: boolean; budgetRegisteredAt: string | null;
  notes: string; createdAt: string; updatedAt: string;
}

export interface SyncLogEntry {
  id: string; projectId: string; projectName: string; action: string;
  status: "success" | "error"; timestamp: string; message: string;
}

export interface ToastNotification {
  id: string; type: "success" | "error" | "warning"; title: string; message: string;
}

export interface SiteListItem {
  id: string; projectName: string; clientName: string; siteAddress: string;
  estimatedAmount: number; assignee: string; startDate: string; endDate: string;
}

const STATUS_OPTIONS: OrderStatus[] = ["見込み","見積中","見積提出済","受注済","施工中","完了","失注"];
const statusToCssClass: Record<OrderStatus, string> = { 見込み:"prospect", 見積中:"estimating", 見積提出済:"submitted", 受注済:"ordered", 施工中:"in-progress", 完了:"completed", 失注:"lost" };

const initialProjects: OrderProject[] = [
  { id:"P001", projectName:"田中邸 新築工事", clientName:"田中太郎", siteAddress:"東京都世田谷区成城1-2-3", estimatedAmount:35000000, orderAmount:33000000, status:"受注済", assignee:"佐藤健一", startDate:"2026-07-01", endDate:"2026-12-15", importedFromSiteList:true, siteListId:"S001", budgetRegistered:true, budgetRegisteredAt:"2026-06-05T14:30:00", notes:"地盤調査完了済み。設計図面確定。", createdAt:"2026-05-20T09:00:00", updatedAt:"2026-06-05T14:30:00" },
  { id:"P002", projectName:"鈴木邸 リフォーム工事", clientName:"鈴木一郎", siteAddress:"東京都杉並区荻窪4-5-6", estimatedAmount:12000000, orderAmount:null, status:"見積中", assignee:"田中裕太", startDate:"2026-08-01", endDate:"2026-10-30", importedFromSiteList:true, siteListId:"S002", budgetRegistered:false, budgetRegisteredAt:null, notes:"キッチン・浴室の全面改装。", createdAt:"2026-05-22T10:00:00", updatedAt:"2026-05-28T15:00:00" },
  { id:"P003", projectName:"(株)山田商事 社屋改修", clientName:"(株)山田商事", siteAddress:"東京都港区赤坂7-8-9", estimatedAmount:180000000, orderAmount:175000000, status:"受注済", assignee:"高橋誠", startDate:"2026-09-01", endDate:"2027-03-31", importedFromSiteList:true, siteListId:"S003", budgetRegistered:true, budgetRegisteredAt:"2026-06-04T10:15:00", notes:"3フロア改装。仮設事務所手配済み。", createdAt:"2026-04-15T11:00:00", updatedAt:"2026-06-04T10:15:00" },
  { id:"P004", projectName:"佐々木邸 増築工事", clientName:"佐々木花子", siteAddress:"神奈川県横浜市青葉区10-11", estimatedAmount:22000000, orderAmount:null, status:"見積提出済", assignee:"佐藤健一", startDate:"2026-07-15", endDate:"2026-11-30", importedFromSiteList:true, siteListId:"S004", budgetRegistered:false, budgetRegisteredAt:null, notes:"2階部分を増築。建築確認申請中。", createdAt:"2026-05-10T13:00:00", updatedAt:"2026-06-01T09:30:00" },
  { id:"P005", projectName:"マンション大規模修繕", clientName:"グリーンパーク管理組合", siteAddress:"千葉県船橋市本町12-13", estimatedAmount:95000000, orderAmount:null, status:"見込み", assignee:"渡辺直美", startDate:"2026-10-01", endDate:"2027-06-30", importedFromSiteList:true, siteListId:"S005", budgetRegistered:false, budgetRegisteredAt:null, notes:"大規模修繕計画の初期段階。管理組合との協議中。", createdAt:"2026-06-01T08:00:00", updatedAt:"2026-06-03T16:00:00" },
  { id:"P006", projectName:"中村医院 建替え工事", clientName:"中村健二", siteAddress:"埼玉県さいたま市浦和区14-15", estimatedAmount:68000000, orderAmount:65000000, status:"施工中", assignee:"高橋誠", startDate:"2026-04-01", endDate:"2026-10-31", importedFromSiteList:false, siteListId:null, budgetRegistered:true, budgetRegisteredAt:"2026-03-20T09:00:00", notes:"解体工事完了。基礎工事進行中。", createdAt:"2026-02-15T10:00:00", updatedAt:"2026-06-05T17:00:00" },
  { id:"P007", projectName:"(株)ABC オフィス内装", clientName:"(株)ABC", siteAddress:"東京都渋谷区神宮前16-17", estimatedAmount:8500000, orderAmount:8200000, status:"完了", assignee:"田中裕太", startDate:"2026-03-01", endDate:"2026-05-15", importedFromSiteList:false, siteListId:null, budgetRegistered:true, budgetRegisteredAt:"2026-02-28T14:00:00", notes:"全工程完了。引き渡し済み。", createdAt:"2026-01-20T09:00:00", updatedAt:"2026-05-15T16:00:00" },
  { id:"P008", projectName:"渡辺邸 外壁塗装工事", clientName:"渡辺次郎", siteAddress:"東京都練馬区石神井台20-21", estimatedAmount:4500000, orderAmount:null, status:"失注", assignee:"渡辺直美", startDate:"", endDate:"", importedFromSiteList:false, siteListId:null, budgetRegistered:false, budgetRegisteredAt:null, notes:"他社に決定。価格面での競合負け。", createdAt:"2026-04-10T11:00:00", updatedAt:"2026-05-20T10:00:00" },
];

const initialSyncLogs: SyncLogEntry[] = [
  { id:"L001", projectId:"P001", projectName:"田中邸 新築工事", action:"予算管理システムに登録", status:"success", timestamp:"2026-06-05T14:30:00", message:"予算管理システムへの自動登録が完了しました" },
  { id:"L002", projectId:"P003", projectName:"(株)山田商事 社屋改修", action:"予算管理システムに登録", status:"success", timestamp:"2026-06-04T10:15:00", message:"予算管理システムへの自動登録が完了しました" },
  { id:"L003", projectId:"P006", projectName:"中村医院 建替え工事", action:"予算管理システムに登録", status:"success", timestamp:"2026-03-20T09:00:00", message:"予算管理システムへの自動登録が完了しました" },
  { id:"L004", projectId:"P007", projectName:"(株)ABC オフィス内装", action:"予算管理システムに登録", status:"success", timestamp:"2026-02-28T14:00:00", message:"予算管理システムへの自動登録が完了しました" },
];

type SortKey = "projectName"|"clientName"|"estimatedAmount"|"status"|"assignee"|"startDate";
type SortDir = "asc"|"desc";
const formatCurrency = (n: number) => "¥" + new Intl.NumberFormat("ja-JP").format(n);
const formatDate = (s: string) => s ? new Date(s).toLocaleDateString("ja-JP") : "—";

export default function App() {
  const [projects, setProjects] = useState<OrderProject[]>(initialProjects);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(initialSyncLogs);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt" as SortKey);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<OrderProject|null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<OrderProject|null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{open:boolean;projectId:string;newStatus:OrderStatus;projectName:string}|null>(null);

  const assignees = useMemo(() => Array.from(new Set(projects.map(p=>p.assignee))).sort(), [projects]);
  const existingSiteIds = useMemo(() => projects.filter(p=>p.siteListId).map(p=>p.siteListId as string), [projects]);

  const filteredProjects = useMemo(() => {
    let r = [...projects];
    if (searchQuery) { const q=searchQuery.toLowerCase(); r=r.filter(p=>p.projectName.toLowerCase().includes(q)||p.clientName.toLowerCase().includes(q)||p.siteAddress.toLowerCase().includes(q)||p.assignee.toLowerCase().includes(q)); }
    if (statusFilter!=="all") r=r.filter(p=>p.status===statusFilter);
    if (assigneeFilter!=="all") r=r.filter(p=>p.assignee===assigneeFilter);
    r.sort((a,b) => {
      let av:string|number="",bv:string|number="";
      switch(sortKey){case"projectName":av=a.projectName;bv=b.projectName;break;case"clientName":av=a.clientName;bv=b.clientName;break;case"estimatedAmount":av=a.estimatedAmount;bv=b.estimatedAmount;break;case"status":av=STATUS_OPTIONS.indexOf(a.status);bv=STATUS_OPTIONS.indexOf(b.status);break;case"assignee":av=a.assignee;bv=b.assignee;break;case"startDate":av=a.startDate||"";bv=b.startDate||"";break;default:av=a.updatedAt;bv=b.updatedAt;}
      if(typeof av==="number"&&typeof bv==="number")return sortDir==="asc"?av-bv:bv-av;
      return sortDir==="asc"?String(av).localeCompare(String(bv),"ja"):String(bv).localeCompare(String(av),"ja");
    });
    return r;
  }, [projects, searchQuery, statusFilter, assigneeFilter, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: projects.length,
    ordered: projects.filter(p=>p.status==="受注済").length,
    totalEstimated: projects.filter(p=>!["完了","失注"].includes(p.status)).reduce((s,p)=>s+p.estimatedAmount,0),
    totalOrdered: projects.filter(p=>["受注済","施工中","完了"].includes(p.status)).reduce((s,p)=>s+(p.orderAmount||p.estimatedAmount),0),
  }), [projects]);

  const addNotification = (type:"success"|"error"|"warning",title:string,message:string) => {
    setNotifications(prev=>[...prev,{id:`toast-${Date.now()}`,type,title,message}]);
  };

  const handleSort = useCallback((key:SortKey) => { if(sortKey===key){setSortDir(d=>d==="asc"?"desc":"asc")}else{setSortKey(key);setSortDir("asc")} }, [sortKey]);

  const handleImport = useCallback((items:SiteListItem[]) => {
    const now=new Date().toISOString();
    const np:OrderProject[]=items.map((item,idx)=>({id:`P${String(projects.length+idx+1).padStart(3,"0")}`,projectName:item.projectName,clientName:item.clientName,siteAddress:item.siteAddress,estimatedAmount:item.estimatedAmount,orderAmount:null,status:"見込み" as OrderStatus,assignee:item.assignee,startDate:item.startDate,endDate:item.endDate,importedFromSiteList:true,siteListId:item.id,budgetRegistered:false,budgetRegisteredAt:null,notes:"",createdAt:now,updatedAt:now}));
    setProjects(prev=>[...prev,...np]);setImportModalOpen(false);
    addNotification("success","取り込み完了",`${items.length}件の工事を現場リストから取り込みました`);
  }, [projects.length]);

  const handleSaveProject = useCallback((project:OrderProject) => {
    setProjects(prev=>{const i=prev.findIndex(p=>p.id===project.id);if(i>=0){const u=[...prev];u[i]=project;return u}return[...prev,project]});
    setFormModalOpen(false);setEditingProject(null);
    addNotification("success","保存完了",`「${project.projectName}」を保存しました`);
  }, []);

  const applyStatusChange = useCallback((projectId:string,newStatus:OrderStatus) => {
    const now=new Date().toISOString();
    setProjects(prev=>prev.map(p=>{
      if(p.id!==projectId)return p;
      const u={...p,status:newStatus,updatedAt:now};
      if(newStatus==="受注済"&&!p.budgetRegistered){
        u.budgetRegistered=true;u.budgetRegisteredAt=now;
        setSyncLogs(prev=>[{id:`L${String(Date.now()).slice(-6)}`,projectId:p.id,projectName:p.projectName,action:"予算管理システムに登録",status:"success",timestamp:now,message:"予算管理システムへの自動登録が完了しました"},...prev]);
        addNotification("success","予算管理システム連携",`「${p.projectName}」を予算管理システムに自動登録しました`);
      }
      return u;
    }));
    setSelectedProject(prev=>{if(prev&&prev.id===projectId)return{...prev,status:newStatus,updatedAt:now,...(newStatus==="受注済"&&!prev.budgetRegistered?{budgetRegistered:true,budgetRegisteredAt:now}:{})};return prev});
    setConfirmDialog(null);
  }, []);

  const handleStatusChange = useCallback((projectId:string,newStatus:OrderStatus) => {
    const p=projects.find(p=>p.id===projectId);if(!p)return;
    if(newStatus==="受注済"&&!p.budgetRegistered){setConfirmDialog({open:true,projectId,newStatus,projectName:p.projectName});return}
    applyStatusChange(projectId,newStatus);
  }, [projects,applyStatusChange]);

  const handleDelete = useCallback((projectId:string) => {
    const p=projects.find(p=>p.id===projectId);
    setProjects(prev=>prev.filter(p=>p.id!==projectId));setDetailDrawerOpen(false);setSelectedProject(null);
    if(p)addNotification("warning","削除完了",`「${p.projectName}」を削除しました`);
  }, [projects]);

  const handleRowClick = useCallback((p:OrderProject)=>{setSelectedProject(p);setDetailDrawerOpen(true)},[]);
  const handleEdit = useCallback((p:OrderProject)=>{setDetailDrawerOpen(false);setEditingProject(p);setFormModalOpen(true)},[]);
  const dismissNotification = useCallback((id:string)=>{setNotifications(prev=>prev.filter(n=>n.id!==id))},[]);

  const renderSortIcon = (key:SortKey) => {
    if(sortKey!==key)return <span className="material-symbols-outlined sort-icon">unfold_more</span>;
    return <span className="material-symbols-outlined sort-icon">{sortDir==="asc"?"expand_less":"expand_more"}</span>;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-title"><span className="material-symbols-outlined app-header-icon">assignment_turned_in</span>受注工事管理表</div>
        <div className="header-status connected"><div className="header-status-dot"/>オンライン</div>
      </header>
      <main className="app-main"><div className="fade-in">
        <div className="page-header" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <h1 className="page-title"><span className="material-symbols-outlined page-title-icon">assignment_turned_in</span>受注工事管理表</h1>
            <p className="page-description">受注工事の進捗管理・現場リスト連携・予算管理自動登録</p>
          </div>
          <div className="btn-group">
            <button className="btn-secondary btn-sm" onClick={()=>setImportModalOpen(true)}><span className="material-symbols-outlined btn-icon">download</span>現場リストから取り込み</button>
            <button className="btn-primary btn-sm" onClick={()=>{setEditingProject(null);setFormModalOpen(true)}}><span className="material-symbols-outlined btn-icon">add</span>手動追加</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card blue"><div className="stat-value">{stats.total}</div><div className="stat-label">総件数</div></div>
          <div className="stat-card green"><div className="stat-value">{stats.ordered}</div><div className="stat-label">受注済</div></div>
          <div className="stat-card orange"><div className="stat-value">{formatCurrency(stats.totalEstimated)}</div><div className="stat-label">見込金額合計</div></div>
          <div className="stat-card red"><div className="stat-value">{formatCurrency(stats.totalOrdered)}</div><div className="stat-label">受注金額合計</div></div>
        </div>

        <div className="filter-bar">
          <div className="search-input-wrap"><span className="material-symbols-outlined search-icon">search</span><input type="text" className="search-input" placeholder="工事名・顧客名・住所で検索..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div>
          <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">全ステータス</option>{STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <select className="filter-select" value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)}><option value="all">全担当者</option>{assignees.map(a=><option key={a} value={a}>{a}</option>)}</select>
        </div>

        {filteredProjects.length===0?(
          <div className="card"><div className="empty-state"><span className="material-symbols-outlined empty-state-icon">search_off</span><div className="empty-state-title">該当する工事がありません</div><div className="empty-state-description">検索条件やフィルターを変更してお試しください。</div></div></div>
        ):(
          <div className="table-container"><table className="data-table"><thead><tr>
            <th className={`sortable ${sortKey==="projectName"?"sorted":""}`} onClick={()=>handleSort("projectName")}>工事名 {renderSortIcon("projectName")}</th>
            <th className={`sortable ${sortKey==="clientName"?"sorted":""}`} onClick={()=>handleSort("clientName")}>顧客名 {renderSortIcon("clientName")}</th>
            <th className={`sortable ${sortKey==="estimatedAmount"?"sorted":""}`} onClick={()=>handleSort("estimatedAmount")}>金額 {renderSortIcon("estimatedAmount")}</th>
            <th className={`sortable ${sortKey==="status"?"sorted":""}`} onClick={()=>handleSort("status")}>ステータス {renderSortIcon("status")}</th>
            <th className={`sortable ${sortKey==="assignee"?"sorted":""}`} onClick={()=>handleSort("assignee")}>担当者 {renderSortIcon("assignee")}</th>
            <th className={`sortable ${sortKey==="startDate"?"sorted":""}`} onClick={()=>handleSort("startDate")}>工期 {renderSortIcon("startDate")}</th>
            <th>連携</th>
          </tr></thead><tbody>
            {filteredProjects.map(project=>(
              <tr key={project.id} className="clickable" onClick={()=>handleRowClick(project)}>
                <td><div style={{fontWeight:500}}>{project.projectName}</div>{project.importedFromSiteList&&<div style={{fontSize:"11px",color:"var(--google-text-sub)",display:"flex",alignItems:"center",gap:"4px",marginTop:"2px"}}><span className="material-symbols-outlined" style={{fontSize:"14px"}}>link</span>現場リスト連携</div>}</td>
                <td>{project.clientName}</td>
                <td><div className="amount-cell">{formatCurrency(project.estimatedAmount)}</div>{project.orderAmount!==null&&<div style={{fontSize:"11px",color:"var(--google-green)",marginTop:"2px"}}>受注: {formatCurrency(project.orderAmount)}</div>}</td>
                <td><span className={`status-badge ${statusToCssClass[project.status]}`}>{project.status}</span></td>
                <td>{project.assignee}</td>
                <td>{project.startDate&&project.endDate?`${formatDate(project.startDate)} 〜 ${formatDate(project.endDate)}`:"—"}</td>
                <td>{project.budgetRegistered?<span className="material-symbols-outlined" style={{color:"var(--google-green)",fontSize:"20px"}} title="予算管理登録済み">check_circle</span>:<span className="material-symbols-outlined" style={{color:"var(--google-border)",fontSize:"20px"}} title="未登録">radio_button_unchecked</span>}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div></main>

      <SiteImportModal isOpen={importModalOpen} onClose={()=>setImportModalOpen(false)} onImport={handleImport} existingSiteIds={existingSiteIds}/>
      <OrderFormModal isOpen={formModalOpen} onClose={()=>{setFormModalOpen(false);setEditingProject(null)}} onSave={handleSaveProject} editProject={editingProject}/>
      <OrderDetailDrawer isOpen={detailDrawerOpen} project={selectedProject} onClose={()=>{setDetailDrawerOpen(false);setSelectedProject(null)}} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} syncLogs={syncLogs}/>
      <BudgetSyncNotification notifications={notifications} onDismiss={dismissNotification}/>

      {confirmDialog&&confirmDialog.open&&(
        <div className="modal-overlay" onClick={()=>setConfirmDialog(null)}><div className="modal-content" style={{maxWidth:"440px"}} onClick={e=>e.stopPropagation()}>
          <div className="modal-body" style={{textAlign:"center",padding:"32px 28px"}}>
            <span className="material-symbols-outlined" style={{fontSize:"48px",color:"var(--google-primary)",marginBottom:"16px",display:"block"}}>account_balance</span>
            <h3 style={{fontSize:"18px",fontWeight:600,marginBottom:"8px"}}>予算管理システムへの登録</h3>
            <p style={{fontSize:"14px",color:"var(--google-text-sub)",lineHeight:1.6}}>「{confirmDialog.projectName}」のステータスを「受注済」に変更すると、予算管理システムに自動登録されます。</p>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={()=>setConfirmDialog(null)}>キャンセル</button>
            <button className="btn-primary" onClick={()=>applyStatusChange(confirmDialog.projectId,confirmDialog.newStatus)}><span className="material-symbols-outlined btn-icon">check</span>確認して登録</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
