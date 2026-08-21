"use client";

import { Check, CheckCircle2, Clipboard, Download, Search, X, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { RankBadge } from "@/components/ui";
import { displayPhone, normalizePhone } from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

export function LeadsClient({ initialLeads }: { initialLeads: any[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [copied, setCopied] = useState<string | null>(null);
  const rows = initialLeads;

  const filtered = useMemo(() => {
    const normalized = normalizePhone(query);
    const text = query.toLowerCase().trim();
    return rows.filter((lead) => {
      if (status !== "Tất cả" && lead.status !== status) return false;
      if (!text) return true;
      if (normalized && lead.phone.includes(normalized)) return true;
      return `${lead.name} ${lead.ad} ${lead.campaign} ${lead.page} ${lead.phone}`
        .toLowerCase()
        .includes(text.replace(/\D/g, "") || text);
    });
  }, [rows, query, status]);

  const copyPhone = async (id: string, phone: string) => {
    await navigator.clipboard.writeText(`0${phone}`);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1200);
  };

  const downloadCsv = () => {
    const lines = [
      ["SĐT", "Tên khách", "Ngày vào", "Quảng cáo", "Chiến dịch", "Fanpage", "Bậc", "Trong CRM", "Trạng thái"],
      ...filtered.map((lead) => [
        `0${lead.phone}`,
        lead.name,
        lead.date,
        lead.ad || "Organic",
        lead.campaign || "",
        lead.page,
        lead.rank,
        lead.crm ? "Có" : "Không",
        lead.status,
      ]),
    ];
    const csv = "\uFEFF" + lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ads-insight-leads.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page leads-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Tra cứu lead</div>
          <h1>Đối chiếu từng số điện thoại</h1>
          <p>Tìm được với mọi định dạng: 0912…, 84912…, +84 912… hoặc 912…</p>
        </div>
        <button className="button" onClick={downloadCsv}>
          <Download size={14} /> Xuất {filtered.length} dòng
        </button>
      </div>

      <div className="lead-toolbar">
        <label className="lead-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm SĐT, tên khách, quảng cáo hoặc fanpage…"
          />
          {query ? <button onClick={() => setQuery("")}><X size={14} /></button> : null}
        </label>
        <label className="lead-status-filter">
          <span>Trạng thái</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {["Tất cả", "Hợp lệ", "Trùng", "Lỗi", "Loại trừ"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="lead-result-count num">{filtered.length} kết quả</div>
      </div>

      <div className="lead-table-card card">
        <div className="lead-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                <th>SĐT</th>
                <th>Tên khách</th>
                <th>Ngày vào</th>
                <th>Quảng cáo mang về</th>
                <th>Chiến dịch</th>
                <th>Fanpage</th>
                <th>Bậc cao nhất</th>
                <th>CRM</th>
                <th>Trạng thái SĐT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div className="phone-cell">
                      <span className="num">{displayPhone(lead.phone)}</span>
                      {lead.phone.length === 9 ? (
                        <button onClick={() => copyPhone(lead.id, lead.phone)} title="Sao chép SĐT">
                          {copied === lead.id ? <Check size={12} /> : <Clipboard size={12} />}
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td>{lead.name}</td>
                  <td className="num">{lead.date}</td>
                  <td>
                    {lead.ad ? <span>{lead.ad}</span> : <span className="organic-badge">Organic</span>}
                  </td>
                  <td>{lead.campaign || "—"}</td>
                  <td>{lead.page}</td>
                  <td><RankBadge rank={lead.rank} /></td>
                  <td>
                    {lead.crm ? <CheckCircle2 size={15} className="crm-yes" /> : <XCircle size={15} className="crm-no" />}
                  </td>
                  <td>
                    <span className={cn("phone-status", `phone-status-${lead.status.toLowerCase().replace("ợ", "o")}`)}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? (
            <div className="empty-state">
              <div>
                <Search size={28} />
                <p>Không có lead khớp với “{query}”.</p>
                <button className="button" onClick={() => setQuery("")}>Xóa tìm kiếm</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
