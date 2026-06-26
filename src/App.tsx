import { useState, useMemo, useCallback } from "react";
import { budgetSupabase } from './budgetSupabaseClient';
import { useProjects } from "./hooks/useProjects";
import { useSyncLogs } from "./hooks/useSyncLogs";
import { useSiteSync } from "./hooks/useSiteSync";
import SiteImportModal from "./components/SiteImportModal";
import OrderFormModal from "./components/OrderFormModal";
import BudgetSyncNotification from "./components/BudgetSyncNotification";
import OrderDetailDrawer from "./components/OrderDetailDrawer";
import SyncStatusBar from "./components/SyncStatusBar";
import type { OrderProject, OrderStatus, SiteListItem, ToastNotification } from "./types";
import { STATUS_OPTIONS, statusToCssClass, formatCurrency, formatDate } from "./types";

type SortKey = "projectName"|"clientName"|"estimatedAmount"|"status"|"assignee"|"startDate";
type SortDir = "asc"|"desc";

export default function App() {
  // ── Supabase Hooks ──
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    addProject,
    updateProject,
    deleteProject: removeProject,
    importFromSiteList,
  } = useProjects();

  const { syncLogs, addSyncLog } = useSyncLogs();

  const {
    syncStatus,
    lastSyncedAt,
    lastSyncCount,
    syncError,
    triggerSync,
    pushStatusToGAS,
  } = useSiteSync(addSyncLog);

  // ── ローカルUI State ──
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("projectName");
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
    if (searchQuery) {
      const q=searchQuery.toLowerCase();
      r=r.filter(p=>p.projectName.toLowerCase().includes(q)||p.clientName.toLowerCase().includes(q)||p.siteAddress.toLowerCase().includes(q)||p.assignee.toLowerCase().includes(q));
    }
    if (statusFilter!=="all") r=r.filter(p=>p.status===statusFilter);
    if (assigneeFilter!=="all") r=r.filter(p=>p.assignee===assigneeFilter);
    r.sort((a,b) => {
      let av:string|number="",bv:string|number="";
      switch(sortKey){
        case"projectName":av=a.projectName;bv=b.projectName;break;
        case"clientName":av=a.clientName;bv=b.clientName;break;
        case"estimatedAmount":av=a.estimatedAmount;bv=b.estimatedAmount;break;
        case"status":av=STATUS_OPTIONS.indexOf(a.status);bv=STATUS_OPTIONS.indexOf(b.status);break;
        case"assignee":av=a.assignee;bv=b.assignee;break;
        case"startDate":av=a.startDate||"";bv=b.startDate||"";break;
        default:av=a.updatedAt;bv=b.updatedAt;
      }
      if(typeof av==="number"&&typeof bv==="number")return sortDir==="asc"?av-bv:bv-av;
      return sortDir==="asc"?String(av).localeCompare(String(bv),"ja"):String(bv).localeCompare(String(av),"ja");
    });
    return r;
  }, [projects, searchQuery, statusFilter, assigneeFilter, sortKey, sortDir]);

  const addNotification = (type:"success"|"error"|"warning",title:string,message:string) => {
    setNotifications(prev=>[...prev,{id:`toast-${Date.now()}`,type,title,message}]);
  };

  const handleSort = useCallback((key:SortKey) => {
    if(sortKey===key){setSortDir(d=>d==="asc"?"desc":"asc")}else{setSortKey(key);setSortDir("asc")}
  }, [sortKey]);

  const handleImport = useCallback(async (items:SiteListItem[]) => {
    try {
      await importFromSiteList(items);
      setImportModalOpen(false);
      addNotification("success","取り込み完了",`${items.length}件の工事を現場リストから取り込みました`);
    } catch {
      addNotification("error","取り込みエラー","現場リストからの取り込みに失敗しました");
    }
  }, [importFromSiteList]);

  const handleSaveProject = useCallback(async (project:OrderProject) => {
    try {
      const existingProject = projects.find(p => p.id === project.id);
      if (existingProject) {
        await updateProject(project);
      } else {
        await addProject(project);
      }
      setFormModalOpen(false);
      setEditingProject(null);
      addNotification("success","保存完了",`「${project.projectName}」を保存しました`);
    } catch {
      addNotification("error","保存エラー","プロジェクトの保存に失敗しました");
    }
  }, [projects, updateProject, addProject]);

  const applyStatusChange = useCallback(async (projectId:string, newStatus:OrderStatus) => {
    const now = new Date().toISOString();
    const p = projects.find(p=>p.id===projectId);
    if (!p) return;

    const updatedProject = { ...p, status: newStatus, updatedAt: now };

    // 受注済に変更時の予算管理システム自動登録
    if (newStatus === "受注済" && !p.budgetRegistered) {
      updatedProject.budgetRegistered = true;
      updatedProject.budgetRegisteredAt = now;
    }

    try {
      await updateProject(updatedProject);

      // === 予算管理システムへ実際にinsert ===
      if (newStatus === "受注済" && !p.budgetRegistered && budgetSupabase) {
        try {
          // projectsテーブルにinsert
          const { data: newProject, error: insertError } = await budgetSupabase
            .from('projects')
            .insert({
              site_name: p.projectName,
              address: p.siteAddress || '',
              department: '',
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          if (newProject) {
            // order_phasesに初期フェーズも作成
            await budgetSupabase.from('order_phases').insert({
              project_id: newProject.id,
              name: p.projectName,
              start_date: p.startDate || null,
              end_date: p.endDate || null,
              contract_amount: p.orderAmount || p.estimatedAmount || 0,
              net_cost_amount: 0,
              sort_order: 0,
            });

            // 受注工事管理表側に予算プロジェクトIDを保存（後でカラム追加が必要）
            console.log('[Budget] 予算管理にプロジェクト作成:', newProject.id);
          }
        } catch (budgetError) {
          console.error('予算管理システムへの登録に失敗:', budgetError);
          // 予算管理の失敗は受注工事管理表のステータス変更をブロックしない
          addNotification("warning","予算管理連携警告",`予算管理システムへの自動登録に失敗しました。手動で登録してください。`);
        }
      }

      // 予算管理ログ
      if (newStatus === "受注済" && !p.budgetRegistered) {
        await addSyncLog({
          id: `L${String(Date.now()).slice(-6)}`,
          projectId: p.id,
          projectName: p.projectName,
          action: "予算管理システムに登録",
          status: "success",
          timestamp: now,
          message: "予算管理システムへの自動登録が完了しました",
        });
        addNotification("success","予算管理システム連携",`「${p.projectName}」を予算管理システムに自動登録しました`);
      }

      // 現場リスト連携プロジェクトの場合、GASにステータスを書き戻し
      if (p.siteListId) {
        await pushStatusToGAS(p.siteListId, newStatus, p.projectName);
      }

      // 詳細ドロワーの表示を更新
      setSelectedProject(prev => {
        if (prev && prev.id === projectId) return updatedProject;
        return prev;
      });
    } catch {
      addNotification("error","更新エラー","ステータスの変更に失敗しました");
    }

    setConfirmDialog(null);
  }, [projects, updateProject, addSyncLog, pushStatusToGAS]);

  const handleStatusChange = useCallback((projectId:string, newStatus:OrderStatus) => {
    const p = projects.find(p=>p.id===projectId);
    if (!p) return;
    if (newStatus === "受注済" && !p.budgetRegistered) {
      setConfirmDialog({ open: true, projectId, newStatus, projectName: p.projectName });
      return;
    }
    applyStatusChange(projectId, newStatus);
  }, [projects, applyStatusChange]);

  const handleDelete = useCallback(async (projectId:string) => {
    const p = projects.find(p=>p.id===projectId);
    try {
      await removeProject(projectId);
      setDetailDrawerOpen(false);
      setSelectedProject(null);
      if (p) addNotification("warning","削除完了",`「${p.projectName}」を削除しました`);
    } catch {
      addNotification("error","削除エラー","プロジェクトの削除に失敗しました");
    }
  }, [projects, removeProject]);

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

      {/* 同期ステータスバー */}
      <SyncStatusBar
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        lastSyncCount={lastSyncCount}
        syncError={syncError}
        onSync={triggerSync}
      />

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

        <div className="filter-bar">
          <div className="search-input-wrap"><span className="material-symbols-outlined search-icon">search</span><input type="text" className="search-input" placeholder="工事名・顧客名・住所で検索..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div>
          <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">全ステータス</option>{STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <select className="filter-select" value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)}><option value="all">全担当者</option>{assignees.map(a=><option key={a} value={a}>{a}</option>)}</select>
        </div>

        {projectsLoading ? (
          <div className="card"><div className="empty-state">
            <span className="material-symbols-outlined empty-state-icon" style={{animation:"spin 1.5s linear infinite"}}>sync</span>
            <div className="empty-state-title">データを読み込み中...</div>
            <div className="empty-state-description">Supabaseからプロジェクトデータを取得しています</div>
          </div></div>
        ) : projectsError ? (
          <div className="card"><div className="empty-state">
            <span className="material-symbols-outlined empty-state-icon" style={{color:"var(--google-red)"}}>cloud_off</span>
            <div className="empty-state-title">接続エラー</div>
            <div className="empty-state-description">{projectsError}</div>
            <button className="btn-secondary btn-sm" style={{marginTop:16}} onClick={()=>window.location.reload()}>
              <span className="material-symbols-outlined btn-icon">refresh</span>再読み込み
            </button>
          </div></div>
        ) : filteredProjects.length===0?(
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
