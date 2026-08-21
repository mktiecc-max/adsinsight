"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Beaker,
  Check,
  ChevronDown,
  Database,
  FileSpreadsheet,
  Link2,
  Save,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/shared/utils";

const levelMap: any[] = [];
const defaultSettings = {
  ads: {
    title: "Nguồn Quảng Cáo",
    description: "Đồng bộ chi tiêu, messages, impressions hàng ngày từ Meta.",
    link: "", tab: "",
    fields: [
      { target: "Mã quảng cáo", column: "", transform: "Không xử lý", required: true },
      { target: "Tên chiến dịch", column: "", transform: "Không xử lý", required: true },
      { target: "Ngày", column: "", transform: "Ngày ISO", required: true },
      { target: "Chi tiêu", column: "", transform: "Không xử lý", required: true },
      { target: "Tin nhắn", column: "", transform: "Không xử lý", required: true },
    ]
  },
  leads: {
    title: "Nguồn Lead",
    description: "Khách đổ về từ POSCAKE hoặc Landing page.",
    link: "", tab: "",
    fields: [
      { target: "SĐT", column: "", transform: "SĐT VN", required: true },
      { target: "Tên khách", column: "", transform: "Không xử lý", required: false },
      { target: "Ngày vào", column: "", transform: "Ngày ISO", required: true },
      { target: "Mã quảng cáo", column: "", transform: "Không xử lý", required: false },
    ]
  },
  crm: {
    title: "Nguồn CRM",
    description: "Cập nhật cấp bậc phễu sau của khách (Level UCMAS/UCKID).",
    link: "", tab: "",
    fields: [
      { target: "SĐT", column: "", transform: "SĐT VN", required: true },
      { target: "Level UCMAS", column: "", transform: "Quy đổi bậc", required: false },
      { target: "Level UCKID", column: "", transform: "Quy đổi bậc", required: false },
      { target: "Trung tâm", column: "", transform: "Không xử lý", required: false },
    ]
  }
};


const targetFieldMap: Record<string, string> = {
  "Mã quảng cáo": "ad_id",
  "Tên chiến dịch": "campaign_name",
  "Ngày": "date",
  "Chi tiêu": "spend",
  "Tin nhắn": "messages",
  "Tên khách": "lead_name",
  "SĐT": "phone",
  "Ngày vào": "created_at",
  "Level UCMAS": "level_ucmas_raw",
  "Level UCKID": "level_uckid_raw",
  "Trung tâm": "center",
};

const transformMap: Record<string, string> = {
  "Cắt khoảng": "text_trim",
  "Sửa mojibake": "fix_mojibake",
  "Ngày ISO": "date_iso",
  "Ngày d/m/y": "date_dmy",
  "Số VN": "number_vn",
  "SĐT VN": "phone_vn",
  "Quy đổi bậc": "value_map",
  "Không xử lý": "none",
};

const reverseTargetMap: Record<string, string> = Object.fromEntries(
  Object.entries(targetFieldMap).map(([k, v]) => [v, k])
);

const reverseTransformMap: Record<string, string> = Object.fromEntries(
  Object.entries(transformMap).map(([k, v]) => [v, k])
);

const tabs = [
  { id: "ads", label: "Quảng cáo", description: "Meta Ads" },
  { id: "leads", label: "Lead", description: "POSCAKE" },
  { id: "crm", label: "Bậc CRM", description: "Level & tư vấn" },
  { id: "general", label: "Chung", description: "Ngưỡng & loại trừ" },
];

function GeneralSettings() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="settings-content">
      <div className="settings-content-head">
        <div>
          <h1>Cấu hình chung</h1>
          <p>Ngưỡng cỡ mẫu, cảnh báo và quy ước toàn hệ thống.</p>
        </div>
        <button className="button button-primary" onClick={() => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 1400);
        }}>
          {saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? "Đã lưu" : "Lưu thay đổi"}
        </button>
      </div>

      <section className="settings-section">
        <div className="settings-section-head">
          <span className="section-number">01</span>
          <div><h2>Cỡ mẫu & khoảng ngày</h2><p>Dòng dưới ngưỡng vẫn hiện nhưng không tham gia xếp hạng.</p></div>
        </div>
        <div className="settings-form-grid">
          <label><span>Tin nhắn tối thiểu</span><input className="num" type="number" defaultValue={20} /></label>
          <label><span>SĐT tối thiểu</span><input className="num" type="number" defaultValue={5} /></label>
          <label><span>Khoảng ngày mặc định</span><select defaultValue="30"><option value="7">7 ngày</option><option value="30">30 ngày</option><option value="90">90 ngày</option></select></label>
          <label><span>Múi giờ</span><input value="Asia/Ho_Chi_Minh" readOnly /></label>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <span className="section-number">02</span>
          <div><h2>Ngưỡng cảnh báo</h2><p>Sửa từng quy tắc, không cần deploy lại ứng dụng.</p></div>
        </div>
        <div className="threshold-table">
          {[
            ["CPR leo thang", "Tăng so với kỳ trước", "40", "%"],
            ["Bẫy tin nhắn rẻ", "Tỷ lệ lấy số / trung vị", "0,6", "lần"],
            ["Bẫy số rẻ", "Thoát bậc 0 / trung vị", "0,5", "lần"],
            ["Số rác bất thường", "Tỷ lệ lỗi + trùng", "25", "%"],
            ["Bão hòa tệp", "Frequency tối đa", "3,0", "lần"],
          ].map((row) => (
            <div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><input className="num" defaultValue={row[2]} /><em>{row[3]}</em></div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <span className="section-number">03</span>
          <div><h2>SĐT loại trừ</h2><p>Không đưa số test, hotline hoặc nội bộ vào mọi mẫu số.</p></div>
        </div>
        <textarea className="blocklist-input num" defaultValue={"912345678 — Số test marketing\n987654321 — Hotline nội bộ"} />
      </section>
    </div>
  );
}

export function SettingsClient({ initialSources = [] }: { initialSources?: any[] }) {
  const params = useParams<{ tab: string }>();
  const tab = tabs.some((item) => item.id === params.tab) ? params.tab : "ads";
  const [inspected, setInspected] = useState(false);
  const [saved, setSaved] = useState(false);
  const [automapped, setAutomapped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sourceLink, setSourceLink] = useState("");
  const [sheetTab, setSheetTab] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [liveHeaders, setLiveHeaders] = useState<string[] | null>(null);
  const [liveTabs, setLiveTabs] = useState<{ title: string; row_count: number }[] | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, unknown>>>([]);
  const [apiError, setApiError] = useState("");
  const [fieldMappings, setFieldMappings] = useState<Record<string, { column: string, transform: string }>>({});
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");

  const config = useMemo(() => {
    if (tab === "general") return null;
    const base = defaultSettings[tab as keyof typeof defaultSettings];
    if (!base) return null;

    const sourceCode = tab === "ads" ? "ads_daily" : tab === "crm" ? "crm_levels" : "leads";
    const liveSource = initialSources.find((s: any) => s.code === sourceCode);
    
    if (!liveSource) return base;

    const mergedFields = base.fields.map(field => {
      const targetCode = targetFieldMap[field.target];
      const liveField = liveSource.fields?.find((f: any) => f.target_field === targetCode);
      if (liveField) {
        return {
          ...field,
          column: liveField.sheet_column || "",
          transform: reverseTransformMap[liveField.transform] || "Không xử lý",
          valid: true,
        };
      }
      return field;
    });

    return {
      ...base,
      link: liveSource.spreadsheet_id || "",
      tab: liveSource.sheet_tab || "",
      fields: mergedFields,
    };
  }, [tab, initialSources]);

  useEffect(() => {
    setInspected(false);
    setSaved(false);
    setAutomapped(false);
    setApiError("");
    setLiveHeaders(null);
    setLiveTabs(null);
    setPreviewRows([]);
    if (config) {
      setSourceLink(config.link);
      setSheetTab(config.tab);
      setHeaderRow(1);
      
      const initial: Record<string, { column: string, transform: string }> = {};
      config.fields.forEach((f: any) => {
        initial[f.target] = { column: f.column || "", transform: f.transform || "Không xử lý" };
      });
      setFieldMappings(initial);
    }
  }, [tab, config]);

  const previewHeaders = useMemo(() => liveHeaders || [], [liveHeaders]);

  const inspectSource = async () => {
    setApiError("");
    try {
      const response = await fetch("/api/settings/inspect-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheet_id: sourceLink,
          sheet_tab: sheetTab,
          range: `'${sheetTab.replace(/'/g, "''")}'!A1:ZZ6`,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không đọc được Google Sheet.");
      setLiveHeaders(payload.data.headers);
      setLiveTabs(payload.data.tabs || null);
      setPreviewRows(payload.data.preview || []);
      setInspected(true);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Không đọc được nguồn.");
    }
  };

  const saveSource = async () => {
    if (!config) return;
    setSaving(true);
    setApiError("");
    const code = tab === "ads" ? "ads_daily" : tab === "crm" ? "crm_levels" : "leads";
    try {
      const response = await fetch(`/api/settings/sources/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: config.title,
          spreadsheet_id: sourceLink,
          sheet_tab: sheetTab,
          header_row: headerRow,
          enabled: true,
          fields: config.fields.map((field: any, index: number) => ({
            target_field: targetFieldMap[field.target] || field.target.toLowerCase().replace(/\s+/g, "_"),
            sheet_column: fieldMappings[field.target]?.column || "",
            transform: transformMap[fieldMappings[field.target]?.transform || field.transform] || "none",
            is_required: field.required,
            sort_order: index,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không lưu được cấu hình.");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Không lưu được cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  const handleAutomap = () => {
    const newMappings = { ...fieldMappings };
    config?.fields.forEach((field: any) => {
      const targetLower = field.target.toLowerCase();
      const match = previewHeaders.find(h => {
        const hLower = h.toLowerCase();
        return hLower.includes(targetLower) || targetLower.includes(hLower) ||
          (targetLower === "mã quảng cáo" && hLower.includes("ad")) ||
          (targetLower === "tên chiến dịch" && hLower.includes("campaign")) ||
          (targetLower === "chi tiêu" && (hLower.includes("spend") || hLower.includes("số tiền đã chi tiêu"))) ||
          (targetLower === "tin nhắn" && (hLower.includes("message") || hLower.includes("kết nối mới")));
      });
      if (match && !newMappings[field.target]?.column) {
        newMappings[field.target] = { ...newMappings[field.target], column: match };
      }
    });
    setFieldMappings(newMappings);
    setAutomapped(true);
    window.setTimeout(() => setAutomapped(false), 2000);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult("");
    try {
      const res = await fetch("/api/sync/start", { method: "POST" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Lỗi không xác định");
      setSyncResult("Đã bắt đầu đồng bộ");
    } catch(e) {
      setSyncResult(e instanceof Error ? `Lỗi: ${e.message}` : "Đồng bộ thất bại");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncResult(""), 4000);
    }
  };

  return (
    <div className="page settings-page">
      <div className="desktop-required-note">
        <Database size={24} />
        <strong>Cài đặt nguồn dữ liệu cần dùng máy tính</strong>
        <p>Mở trang này trên màn hình từ 768px để sửa cấu hình và ánh xạ cột.</p>
      </div>

      <div className="desktop-admin-content settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">Cài đặt</div>
          <nav>
            {tabs.map((item) => (
              <Link key={item.id} href={`/settings/${item.id}`} className={cn(tab === item.id && "active")}>
                <span>{item.label}</span>
                <small>{item.description}</small>
              </Link>
            ))}
          </nav>
          <div className="connection-state">
            <span style={{ backgroundColor: initialSources.length >= 3 ? "var(--color-success)" : "var(--color-warning)" }} />
            <div><strong>{initialSources.length}/3 nguồn kết nối</strong><small>Đã lưu trong hệ thống</small></div>
          </div>
          <div style={{ padding: "0 24px 24px" }}>
            <Link href="/sync" className="button button-primary" style={{ width: "100%", justifyContent: "center" }}>
              <Database size={14} /> Đồng bộ tất cả ngay
            </Link>
          </div>
        </aside>

        {tab === "general" ? <GeneralSettings /> : config ? (
          <div className="settings-content">
            <div className="settings-content-head">
              <div>
                <h1>{config.title}</h1>
                <p>{config.description}</p>
              </div>
              <button className="button button-primary" onClick={() => {
                void saveSource();
              }} disabled={saving}>
                {saved ? <Check size={14} /> : <Save size={14} />}
                {saving ? "Đang lưu…" : saved ? "Đã lưu" : "Lưu cấu hình"}
              </button>
            </div>

            <section className="settings-section">
              <div className="settings-section-head">
                <span className="section-number">01</span>
                <div><h2>Kết nối</h2><p>Google Sheet chỉ được đọc bằng Service Account.</p></div>
              </div>
              <div className="connection-form">
                <label className="source-link-field">
                  <span>Link nguồn dữ liệu</span>
                  <div><Link2 size={14} /><input value={sourceLink} onChange={(event) => setSourceLink(event.target.value)} /></div>
                </label>
                <label>
                  <span>Tab</span>
                  <div className="select-like">
                    <FileSpreadsheet size={14} />
                    <select value={sheetTab} onChange={(event) => { setSheetTab(event.target.value); setInspected(false); }}>
                      <option value="">— Tab đầu tiên —</option>
                      {liveTabs ? liveTabs.map((t) => (
                        <option key={t.title} value={t.title}>{t.title} ({t.row_count} dòng)</option>
                      )) : (
                        config.tab ? <option value={config.tab}>{config.tab}</option> : null
                      )}
                    </select>
                    <ChevronDown size={13} />
                  </div>
                </label>
                <label>
                  <span>Dòng tiêu đề</span>
                  <input className="num" type="number" value={headerRow} min={1} onChange={(event) => setHeaderRow(Number(event.target.value) || 1)} />
                </label>
                <button className="button" onClick={() => void inspectSource()}><ScanSearch size={14} /> Đọc cấu trúc</button>
              </div>
              {apiError ? <div className="settings-api-error"><AlertTriangle size={14} /> {apiError}</div> : null}
              {inspected ? (
                <div className="sheet-preview">
                  <div className="sheet-preview-head"><Check size={13} /> Đọc được {previewHeaders.length} cột · xem trước {Math.max(previewRows.length, 5)} dòng</div>
                  <div className="sheet-preview-wrap">
                    <table>
                      <thead><tr>{previewHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead>
                      <tbody>
                        {previewRows.map((row, rowIndex) => (
                          <tr key={rowIndex}>{previewHeaders.map((header) => <td key={header}>{String(row[header] ?? "")}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="settings-section">
              <div className="settings-section-head">
                <span className="section-number">02</span>
                <div><h2>Ánh xạ trường</h2><p>Tên cột nguồn không được hardcode trong ứng dụng.</p></div>
                <button className="button button-small" onClick={handleAutomap}>
                  <Sparkles size={13} /> {automapped ? "Đã khớp xong" : "Tự động khớp"}
                </button>
              </div>
              <div className="field-map-table">
                <div className="field-map-head"><span>Trường chuẩn</span><span>Cột trong nguồn</span><span>Xử lý</span><span /></div>
                {config.fields.map((field: any) => {
                  const mappedCol = fieldMappings[field.target]?.column;
                  const transform = fieldMappings[field.target]?.transform || "Không xử lý";
                  
                  const sampleValues = mappedCol && previewRows.length > 0 
                    ? previewRows.map(r => r[mappedCol]).filter(v => v !== undefined && String(v).trim() !== "").slice(0, 2).map(v => {
                        const original = String(v).trim();
                        let transformed = original;
                        switch (transform) {
                          case "Số VN":
                            transformed = String(Number(original.replace(/\./g, "").replace(/,/g, ".")));
                            if (transformed === "NaN") transformed = "Lỗi";
                            break;
                          case "SĐT VN": {
                            let p = original.replace(/\D/g, "");
                            if (p.startsWith("84")) p = "0" + p.slice(2);
                            transformed = p;
                            break;
                          }
                          case "Ngày ISO": {
                            const match = original.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                            if (match) transformed = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
                            else transformed = "Y-M-D"; // approximate mock
                            break;
                          }
                          case "Quy đổi bậc":
                            transformed = "Bậc 1"; // mock
                            break;
                        }
                        return transform === "Không xử lý" ? original : `${original} ➔ ${transformed}`;
                    }).join(", ")
                    : "";

                  return (
                    <div key={field.target} style={{ borderTop: "1px solid var(--line)" }}>
                      <div className="field-map-row" style={{ borderTop: "none", minHeight: sampleValues ? "36px" : "43px" }}>
                        <strong>{field.target}{field.required ? <i title="Bắt buộc" /> : null}</strong>
                        <select 
                          value={fieldMappings[field.target]?.column || ""}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, [field.target]: { ...prev[field.target], column: e.target.value } }))}
                        >
                          <option value="">— chưa chọn —</option>
                          {previewHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                          {!previewHeaders.includes(fieldMappings[field.target]?.column) && fieldMappings[field.target]?.column && (
                            <option value={fieldMappings[field.target]?.column}>{fieldMappings[field.target]?.column}</option>
                          )}
                        </select>
                        <select 
                          value={fieldMappings[field.target]?.transform || "Không xử lý"}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, [field.target]: { ...prev[field.target], transform: e.target.value } }))}
                        >
                          {Object.keys(transformMap).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className={fieldMappings[field.target]?.column ? "map-valid" : "map-invalid"}>
                          {fieldMappings[field.target]?.column ? <Check size={14} /> : <AlertTriangle size={14} />}
                        </span>
                      </div>
                      {sampleValues ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 28px", gap: "9px", padding: "0 7px 10px" }}>
                          <div />
                          <div style={{ color: "var(--muted)", fontSize: "9px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            VD: {sampleValues}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {tab === "crm" ? (
              <section className="settings-section">
                <div className="settings-section-head">
                  <span className="section-number">03</span>
                  <div><h2>Quy đổi bậc</h2><p>Giá trị mới chưa gán đang tính là bậc 0 và được cảnh báo.</p></div>
                </div>
                <div className="level-map-table">
                  <div className="level-map-head"><span>Giá trị</span><span>Bậc</span><span>Số dòng đang có</span></div>
                  {levelMap.map((item) => (
                    <div key={item.raw} className={cn(item.isNew && "new")}>
                      <strong>{item.raw}{item.isNew ? <em>Mới</em> : null}</strong>
                      <select defaultValue={item.rank ?? ""}><option value="">—</option>{[0, 1, 2, 3, 4].map((rank) => <option key={rank}>{rank}</option>)}</select>
                      <span className="num">{item.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="settings-section">
              <div className="settings-section-head">
                <span className="section-number">{tab === "crm" ? "04" : "03"}</span>
                <div><h2>Chạy thử & đồng bộ</h2><p>Luôn chạy thử sạch trước khi ghi dữ liệu thật.</p></div>
              </div>
              <div className="settings-sync-actions">
                <button className="button"><Beaker size={14} /> Chạy thử nguồn này</button>
                <button className="button button-primary" onClick={handleSync} disabled={syncing}>
                  {syncing ? <Database size={14} className="animate-spin" /> : <Database size={14} />}
                  {syncing ? "Đang đồng bộ..." : syncResult || "Đồng bộ nguồn này"}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
