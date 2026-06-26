import { useState, useEffect } from "react";
import type { OrderProject, OrderStatus } from "../types";
import { STATUS_OPTIONS } from "../types";

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: OrderProject) => void;
  editProject?: OrderProject | null;
}

interface FormData {
  projectName: string; clientName: string; siteAddress: string; estimatedAmount: string;
  orderAmount: string; status: OrderStatus; assignee: string; startDate: string; endDate: string; notes: string;
}

interface FormErrors { projectName?: string; clientName?: string; siteAddress?: string; estimatedAmount?: string; assignee?: string; }

const initialFormData: FormData = { projectName:"", clientName:"", siteAddress:"", estimatedAmount:"", orderAmount:"", status:"見込み", assignee:"", startDate:"", endDate:"", notes:"" };

export default function OrderFormModal({ isOpen, onClose, onSave, editProject }: OrderFormModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const isEditMode = !!editProject;

  useEffect(() => {
    if (editProject) {
      setFormData({ projectName:editProject.projectName, clientName:editProject.clientName, siteAddress:editProject.siteAddress, estimatedAmount:String(editProject.estimatedAmount), orderAmount:editProject.orderAmount!==null?String(editProject.orderAmount):"", status:editProject.status, assignee:editProject.assignee, startDate:editProject.startDate, endDate:editProject.endDate, notes:editProject.notes });
    } else { setFormData(initialFormData); }
    setErrors({});
  }, [editProject, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const ne: FormErrors = {};
    if (!formData.projectName.trim()) ne.projectName = "工事名は必須です";
    if (!formData.clientName.trim()) ne.clientName = "顧客名は必須です";
    if (!formData.siteAddress.trim()) ne.siteAddress = "現場住所は必須です";
    if (!formData.estimatedAmount.trim()) ne.estimatedAmount = "見積金額は必須です";
    else if (isNaN(Number(formData.estimatedAmount)) || Number(formData.estimatedAmount) <= 0) ne.estimatedAmount = "正の数値を入力してください";
    if (!formData.assignee.trim()) ne.assignee = "担当者は必須です";
    setErrors(ne); return Object.keys(ne).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    const project: OrderProject = {
      id: editProject?.id ?? `P${Date.now().toString().slice(-6)}`,
      projectName: formData.projectName.trim(), clientName: formData.clientName.trim(),
      siteAddress: formData.siteAddress.trim(), estimatedAmount: Number(formData.estimatedAmount),
      orderAmount: formData.orderAmount ? Number(formData.orderAmount) : null,
      status: formData.status, assignee: formData.assignee.trim(),
      startDate: formData.startDate, endDate: formData.endDate,
      importedFromSiteList: editProject?.importedFromSiteList ?? false,
      siteListId: editProject?.siteListId ?? null,
      budgetRegistered: editProject?.budgetRegistered ?? false,
      budgetRegisteredAt: editProject?.budgetRegisteredAt ?? null,
      notes: formData.notes, createdAt: editProject?.createdAt ?? now, updatedAt: now,
    };
    onSave(project); setFormData(initialFormData); setErrors({});
  };

  const handleClose = () => { setFormData(initialFormData); setErrors({}); onClose(); };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="material-symbols-outlined modal-title-icon">{isEditMode ? "edit" : "add_circle"}</span>
            {isEditMode ? "工事案件を編集" : "新規工事案件を追加"}
          </h2>
          <button className="modal-close" onClick={handleClose}><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">工事名<span className="required">*</span></label>
              <input type="text" name="projectName" className="form-input" placeholder="例: 田中邸 新築工事" value={formData.projectName} onChange={handleChange} style={errors.projectName?{borderColor:"var(--google-red)"}:{}}/>
              {errors.projectName && <p style={{fontSize:12,color:"var(--google-red)",marginTop:4}}>{errors.projectName}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">顧客名<span className="required">*</span></label>
              <input type="text" name="clientName" className="form-input" placeholder="例: 田中太郎" value={formData.clientName} onChange={handleChange} style={errors.clientName?{borderColor:"var(--google-red)"}:{}}/>
              {errors.clientName && <p style={{fontSize:12,color:"var(--google-red)",marginTop:4}}>{errors.clientName}</p>}
            </div>
            <div className="form-group" style={{gridColumn:"1 / -1"}}>
              <label className="form-label">現場住所<span className="required">*</span></label>
              <input type="text" name="siteAddress" className="form-input" placeholder="例: 東京都世田谷区成城1-2-3" value={formData.siteAddress} onChange={handleChange} style={errors.siteAddress?{borderColor:"var(--google-red)"}:{}}/>
              {errors.siteAddress && <p style={{fontSize:12,color:"var(--google-red)",marginTop:4}}>{errors.siteAddress}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">見積金額<span className="required">*</span></label>
              <input type="number" name="estimatedAmount" className="form-input" placeholder="例: 35000000" value={formData.estimatedAmount} onChange={handleChange} min="0" style={errors.estimatedAmount?{borderColor:"var(--google-red)"}:{}}/>
              {errors.estimatedAmount && <p style={{fontSize:12,color:"var(--google-red)",marginTop:4}}>{errors.estimatedAmount}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">受注金額</label>
              <input type="number" name="orderAmount" className="form-input" placeholder="例: 33000000" value={formData.orderAmount} onChange={handleChange} min="0"/>
            </div>
            <div className="form-group">
              <label className="form-label">ステータス</label>
              <select name="status" className="form-select" value={formData.status} onChange={handleChange}>{STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select>
            </div>
            <div className="form-group">
              <label className="form-label">担当者<span className="required">*</span></label>
              <input type="text" name="assignee" className="form-input" placeholder="例: 佐藤健一" value={formData.assignee} onChange={handleChange} style={errors.assignee?{borderColor:"var(--google-red)"}:{}}/>
              {errors.assignee && <p style={{fontSize:12,color:"var(--google-red)",marginTop:4}}>{errors.assignee}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">着工予定日</label>
              <input type="date" name="startDate" className="form-input" value={formData.startDate} onChange={handleChange}/>
            </div>
            <div className="form-group">
              <label className="form-label">完工予定日</label>
              <input type="date" name="endDate" className="form-input" value={formData.endDate} onChange={handleChange}/>
            </div>
            <div className="form-group" style={{gridColumn:"1 / -1"}}>
              <label className="form-label">備考</label>
              <textarea name="notes" className="form-textarea" placeholder="備考やメモを入力..." value={formData.notes} onChange={handleChange} rows={3}/>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>キャンセル</button>
          <button className="btn-primary" onClick={handleSave}><span className="material-symbols-outlined btn-icon">save</span>保存</button>
        </div>
      </div>
    </div>
  );
}
