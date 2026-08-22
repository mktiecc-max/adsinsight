"use client";

import { Download, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export function AdsClient({ initialData }: { initialData: any[] }) {
  const [query, setQuery] = useState("");
  const rows = initialData;

  const filtered = useMemo(() => {
    const text = query.toLowerCase().trim();
    return rows.filter((row) => {
      if (!text) return true;
      return `${row.campaign_name} ${row.adset_name} ${row.ad_name} ${row.brand} ${row.owner}`
        .toLowerCase()
        .includes(text);
    });
  }, [rows, query]);

  const downloadCsv = () => {
    const lines = [
      ["Ngày", "Chiến dịch", "Nhóm QC", "Tên QC", "Brand", "Người chạy", "Tài khoản", "Chi tiêu", "Tin nhắn", "Hiển thị", "Clicks", "Reach"],
      ...filtered.map((row) => [
        row.date,
        row.campaign_name || "",
        row.adset_name || "",
        row.ad_name || "",
        row.brand || "",
        row.owner || "",
        row.account_id || "",
        row.spend,
        row.messages,
        row.impressions,
        row.clicks,
        row.reach,
      ]),
    ];
    const csv = "\uFEFF" + lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ads-insight-ads.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page leads-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Dữ liệu thô</div>
          <h1>Dữ liệu Quảng cáo (Ads)</h1>
          <p>Xem toàn bộ dữ liệu kéo trực tiếp từ POSCAKE/Facebook.</p>
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
            placeholder="Tìm theo chiến dịch, nhóm quảng cáo, tên quảng cáo..."
          />
          {query ? <button onClick={() => setQuery("")}><X size={14} /></button> : null}
        </label>
        <div className="lead-result-count num">{filtered.length} kết quả</div>
      </div>

      <div className="lead-table-card card">
        <div className="lead-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Chiến dịch</th>
                <th>Nhóm QC</th>
                <th>Tên QC</th>
                <th>Brand</th>
                <th>Người chạy</th>
                <th>Tài khoản</th>
                <th className="num">Chi tiêu</th>
                <th className="num">Tin nhắn</th>
                <th className="num">Hiển thị</th>
                <th className="num">Clicks</th>
                <th className="num">Reach</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i}>
                  <td className="num">{row.date}</td>
                  <td>{row.campaign_name}</td>
                  <td className="subtle">{row.adset_name}</td>
                  <td>{row.ad_name}</td>
                  <td className="subtle">{row.brand}</td>
                  <td className="subtle">{row.owner}</td>
                  <td className="subtle">{row.account_id}</td>
                  <td className="num">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(row.spend || 0)}</td>
                  <td className="num">{row.messages}</td>
                  <td className="num">{row.impressions}</td>
                  <td className="num">{row.clicks}</td>
                  <td className="num">{row.reach}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="empty-state">
                    Không tìm thấy dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
