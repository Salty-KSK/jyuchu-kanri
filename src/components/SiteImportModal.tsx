import { useState, useEffect } from "react";
import type { SiteListItem, GenbaRawData } from "../types";
import { formatCurrency, formatDate } from "../types";

const GAS_URL = import.meta.env.VITE_GAS_API_URL as string ||
  'https://script.google.com/macros/s/AKfycbyPojVK0xgrKyMBPOYDcr7IFvaJsoW0JaJntjOvZEqRXnbZgdRz4NZkFdCpeA6oiDDY/exec';

interface SiteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: SiteListItem[]) => void;
  existingSiteIds: string[];
}

function parseAmount(numStr: string): number {
  if (!numStr) return 0;
  const num = parseInt(numStr.toString().replace(/,/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function mapToSiteListItem(raw: GenbaRawData): SiteListItem {
  return {
    id: raw.id,
    projectName: raw.name || "",
    clientName: raw.contractor && raw.contractor !== "---" ? raw.contractor : "",
    siteAddress: raw.remarks || "",
    estimatedAmount: parseAmount(raw.expectedAmount) || parseAmount(raw.orderAmount),
    assignee: raw.assignee && raw.assignee !== "---"
      ? raw.assignee
      : (raw.person && raw.person !== "---" ? raw.person : ""),
    startDate: raw.startDate || "",
    endDate: raw.endDate || "",
  };
}

export default function SiteImportModal({ isOpen, onClose, onImport, existingSiteIds }: SiteImportModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [siteList, setSiteList] = useState<SiteListItem[]>([]);
  const [rawDataMap, setRawDataMap] = useState<Map<string, GenbaRawData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    fetch(GAS_URL)
      .then(res => res.json())
      .then((rawData: GenbaRawData[]) => {
        if (Array.isArray(rawData)) {
          const validData = rawData.filter(r => r.name && r.name.trim() !== "");
          const mapped = validData.map(mapToSiteListItem);
          setSiteList(mapped);
          // ステータス等の表示用に生データも保持
          const map = new Map<string, GenbaRawData>();
          validData.forEach(r => map.set(r.id, r));
          setRawDataMap(map);
        } else {
          setSiteList([]);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to fetch site list:", e);
        setError("現場一覧システムとの通信に失敗しました。ネットワーク接続を確認してください。");
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSites = siteList.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.projectName.toLowerCase().includes(q)
      || s.clientName.toLowerCase().includes(q)
      || s.assignee.toLowerCase().includes(q)
      || s.siteAddress.toLowerCase().includes(q);
  });

  const isAlreadyImported = (id: string) => existingSiteIds.includes(id);
  const handleToggle = (id: string) => { if (isAlreadyImported(id)) return; setSelectedIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]); };
  const handleImport = () => { onImport(siteList.filter(s => selectedIds.includes(s.id))); setSelectedIds([]); setSearchQuery(""); };
  const handleClose = () => { setSelectedIds([]); setSearchQuery(""); onClose(); };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "受注済": return "ordered";
      case "受注予定": return "prospect";
      case "計画中": return "estimating";
      case "失注": return "lost";
      default: return "";
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title"><span className="material-symbols-outlined modal-title-icon">download</span>現場リストから取り込み</h2>
          <button className="modal-close" onClick={handleClose}><span className="material-symbols-outlined">close</span></button>
        </div>

        <div style={{ padding: "0 28px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12, color: "var(--google-text-sub)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--google-green)" }}>cloud_sync</span>
            現場一覧システムからリアルタイム取得
          </div>
          <div className="search-input-wrap">
            <span className="material-symbols-outlined search-icon">search</span>
            <input type="text" className="search-input" placeholder="現場名・元請会社・担当者で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: "48px", animation: "spin 1.5s linear infinite" }}>sync</span>
              <p className="empty-state-title" style={{ fontSize: "15px" }}>現場一覧を取得中...</p>
              <p style={{ fontSize: "12px", color: "var(--google-text-sub)", marginTop: 4 }}>現場一覧システムに接続しています</p>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: "48px", color: "var(--google-red)" }}>cloud_off</span>
              <p className="empty-state-title" style={{ fontSize: "15px", color: "var(--google-red)" }}>接続エラー</p>
              <p style={{ fontSize: "12px", color: "var(--google-text-sub)", marginTop: 4, lineHeight: 1.6 }}>{error}</p>
              <button className="btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => { setLoading(true); setError(null); fetch(GAS_URL).then(r => r.json()).then((d: GenbaRawData[]) => { if (Array.isArray(d)) { const v = d.filter(r => r.name && r.name.trim() !== ""); setSiteList(v.map(mapToSiteListItem)); const m = new Map<string, GenbaRawData>(); v.forEach(r => m.set(r.id, r)); setRawDataMap(m); } setLoading(false); }).catch(() => { setError("再接続に失敗しました"); setLoading(false); }); }}>
                <span className="material-symbols-outlined btn-icon">refresh</span>再試行
              </button>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: "48px" }}>search_off</span>
              <p className="empty-state-title" style={{ fontSize: "15px" }}>
                {siteList.length === 0 ? "現場一覧にデータがありません" : "該当する現場が見つかりません"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredSites.map(site => {
                const imported = isAlreadyImported(site.id);
                const checked = selectedIds.includes(site.id);
                const raw = rawDataMap.get(site.id);
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{site.projectName}</span>
                        {imported && <span className="status-badge info" style={{ fontSize: 11, padding: "2px 10px" }}>取り込み済み</span>}
                        {raw && raw.status && <span className={`status-badge ${getStatusClass(raw.status)}`} style={{ fontSize: 11, padding: "2px 10px" }}>{raw.status}</span>}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--google-text-sub)" }}>
                        {site.clientName && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>business</span>{site.clientName}</span>}
                        {site.assignee && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>{site.assignee}</span>}
                        {raw && raw.department && raw.department !== "---" && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>corporate_fare</span>{raw.department}</span>}
                        {site.estimatedAmount > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>{formatCurrency(site.estimatedAmount)}</span>}
                        {site.startDate && site.endDate && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_month</span>{formatDate(site.startDate)} 〜 {formatDate(site.endDate)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div style={{ flex: 1, fontSize: 12, color: "var(--google-text-sub)" }}>
            {!loading && !error && <span>{siteList.length}件中 {filteredSites.length}件表示</span>}
          </div>
          <button className="btn-secondary" onClick={handleClose}>キャンセル</button>
          <button className="btn-primary" onClick={handleImport} disabled={selectedIds.length === 0} style={{ opacity: selectedIds.length === 0 ? 0.5 : 1, cursor: selectedIds.length === 0 ? "not-allowed" : "pointer" }}>
            <span className="material-symbols-outlined btn-icon">download</span>取り込む（{selectedIds.length}件）
          </button>
        </div>
      </div>
    </div>
  );
}
