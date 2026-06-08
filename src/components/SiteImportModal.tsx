import { useState } from "react";

interface SiteListItem {
  id: string; projectName: string; clientName: string; siteAddress: string;
  estimatedAmount: number; assignee: string; startDate: string; endDate: string;
}

interface SiteImportModalProps {
  isOpen: boolean; onClose: () => void; onImport: (items: SiteListItem[]) => void; existingSiteIds: string[];
}

const mockSiteList: SiteListItem[] = [
  { id:"S001", projectName:"田中邸 新築工事", clientName:"田中太郎", siteAddress:"東京都世田谷区成城1-2-3", estimatedAmount:35000000, assignee:"佐藤健一", startDate:"2026-07-01", endDate:"2026-12-15" },
  { id:"S002", projectName:"鈴木邸 リフォーム工事", clientName:"鈴木一郎", siteAddress:"東京都杉並区荻窪4-5-6", estimatedAmount:12000000, assignee:"田中裕太", startDate:"2026-08-01", endDate:"2026-10-30" },
  { id:"S003", projectName:"(株)山田商事 社屋改修", clientName:"(株)山田商事", siteAddress:"東京都港区赤坂7-8-9", estimatedAmount:180000000, assignee:"高橋誠", startDate:"2026-09-01", endDate:"2027-03-31" },
  { id:"S004", projectName:"佐々木邸 増築工事", clientName:"佐々木花子", siteAddress:"神奈川県横浜市青葉区10-11", estimatedAmount:22000000, assignee:"佐藤健一", startDate:"2026-07-15", endDate:"2026-11-30" },
  { id:"S005", projectName:"グリーンパーク マンション大規模修繕", clientName:"グリーンパーク管理組合", siteAddress:"千葉県船橋市本町12-13", estimatedAmount:95000000, assignee:"渡辺直美", startDate:"2026-10-01", endDate:"2027-06-30" },
  { id:"S006", projectName:"中村医院 建替え工事", clientName:"中村健二", siteAddress:"埼玉県さいたま市浦和区14-15", estimatedAmount:68000000, assignee:"高橋誠", startDate:"2026-08-15", endDate:"2027-02-28" },
  { id:"S007", projectName:"(株)ABC オフィス内装", clientName:"(株)ABC", siteAddress:"東京都渋谷区神宮前16-17", estimatedAmount:8500000, assignee:"田中裕太", startDate:"2026-07-01", endDate:"2026-08-31" },
  { id:"S008", projectName:"高橋邸 外壁塗装工事", clientName:"高橋美香", siteAddress:"東京都練馬区石神井台18-19", estimatedAmount:4500000, assignee:"渡辺直美", startDate:"2026-06-20", endDate:"2026-07-31" },
];

const formatCurrency = (n: number) => `¥${new Intl.NumberFormat("ja-JP").format(n)}`;

export default function SiteImportModal({ isOpen, onClose, onImport, existingSiteIds }: SiteImportModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  if (!isOpen) return null;

  const filteredSites = mockSiteList.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.projectName.toLowerCase().includes(q) || s.clientName.toLowerCase().includes(q) || s.siteAddress.toLowerCase().includes(q);
  });

  const isAlreadyImported = (id: string) => existingSiteIds.includes(id);
  const handleToggle = (id: string) => { if (isAlreadyImported(id)) return; setSelectedIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]); };
  const handleImport = () => { onImport(mockSiteList.filter(s => selectedIds.includes(s.id))); setSelectedIds([]); setSearchQuery(""); };
  const handleClose = () => { setSelectedIds([]); setSearchQuery(""); onClose(); };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title"><span className="material-symbols-outlined modal-title-icon">download</span>現場リストから取り込み</h2>
          <button className="modal-close" onClick={handleClose}><span className="material-symbols-outlined">close</span></button>
        </div>

        <div style={{ padding: "0 28px 16px" }}>
          <div className="search-input-wrap">
            <span className="material-symbols-outlined search-icon">search</span>
            <input type="text" className="search-input" placeholder="工事名・顧客名・住所で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="modal-body">
          {filteredSites.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: "48px" }}>search_off</span>
              <p className="empty-state-title" style={{ fontSize: "15px" }}>該当する現場が見つかりません</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredSites.map(site => {
                const imported = isAlreadyImported(site.id);
                const checked = selectedIds.includes(site.id);
                return (
                  <div key={site.id} onClick={() => handleToggle(site.id)} style={{
                    display: "flex", alignItems: "flex-start", gap: "14px", padding: "14px 16px", borderRadius: "12px",
                    border: `1px solid ${checked ? "var(--google-primary)" : "var(--google-border-light)"}`,
                    background: imported ? "#F8F9FA" : checked ? "rgba(11,87,208,0.04)" : "var(--google-surface)",
                    cursor: imported ? "default" : "pointer", opacity: imported ? 0.6 : 1, transition: "var(--google-transition)",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
                      border: `2px solid ${imported ? "var(--google-border)" : checked ? "var(--google-primary)" : "var(--google-border)"}`,
                      background: imported ? "var(--google-border-light)" : checked ? "var(--google-primary)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {(checked || imported) && <span className="material-symbols-outlined" style={{ fontSize: 16, color: imported ? "var(--google-text-sub)" : "#FFF" }}>check</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{site.projectName}</span>
                        {imported && <span className="status-badge info" style={{ fontSize: 11, padding: "2px 10px" }}>取り込み済み</span>}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--google-text-sub)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>{site.clientName}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>{site.siteAddress}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>{formatCurrency(site.estimatedAmount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>キャンセル</button>
          <button className="btn-primary" onClick={handleImport} disabled={selectedIds.length === 0} style={{ opacity: selectedIds.length === 0 ? 0.5 : 1, cursor: selectedIds.length === 0 ? "not-allowed" : "pointer" }}>
            <span className="material-symbols-outlined btn-icon">download</span>取り込む（{selectedIds.length}件）
          </button>
        </div>
      </div>
    </div>
  );
}
