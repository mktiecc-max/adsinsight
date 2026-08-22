"use client";

import { Download, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { RankBadge } from "@/components/ui";

export function CrmClient({ initialData }: { initialData: any[] }) {
  const [query, setQuery] = useState("");
  const rows = initialData;

  const filtered = useMemo(() => {
    const text = query.toLowerCase().trim();
    return rows.filter((row) => {
      if (!text) return true;
      return `${row.phone} ${row.center} ${row.sale_owner}`
        .toLowerCase()
        .includes(text.replace(/\D/g, "") || text);
    });
  }, [rows, query]);

  const downloadCsv = () => {
    const lines = [
      ["SĐT", "Bậc tối đa", "Bậc hiện tại", "Cơ sở", "Sale", "Ngày tương tác QC đầu", "Lần cập nhật cuối", "Trong CRM", "Brand QC đầu", "Người chạy QC đầu", "Tài khoản QC đầu"],
      ...filtered.map((row) => [
        `0${row.phone}`,
        row.max_rank,
        row.current_rank,
        row.center || "",
        row.sale_owner || "",
        row.first_seen_at || "",
        row.updated_at ? new Date(row.updated_at).toLocaleString("vi-VN") : "",
        row.in_crm ? "Có" : "Không",
        row.dim_ad?.brand || "",
        row.dim_ad?.owner || "",
        row.dim_ad?.account_id || "",
      ]),
    ];
    const csv = "\uFEFF" + lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ads-insight-crm.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page leads-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Dữ liệu tổng hợp</div>
          <h1>Dữ liệu khách hàng (CRM)</h1>
          <p>Mỗi khách hàng là 1 dòng duy nhất, lấy Bậc cao nhất từ file CRM đối chiếu.</p>
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
            placeholder="Tìm theo Số điện thoại, cơ sở, sale..."
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
                <th>SĐT</th>
                <th>Bậc tối đa</th>
                <th>Cơ sở</th>
                <th>Sale</th>
                <th>Ngày nhận QC</th>
                <th>Brand (QC đầu)</th>
                <th>Người chạy</th>
                <th>Cập nhật cuối</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i}>
                  <td className="num">0{row.phone}</td>
                  <td><RankBadge rank={row.max_rank} /></td>
                  <td>{row.center}</td>
                  <td className="subtle">{row.sale_owner}</td>
                  <td className="num">{row.first_seen_at}</td>
                  <td className="subtle">{row.dim_ad?.brand}</td>
                  <td className="subtle">{row.dim_ad?.owner}</td>
                  <td className="num subtle">{row.updated_at ? new Date(row.updated_at).toLocaleDateString("vi-VN") : ""}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
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
