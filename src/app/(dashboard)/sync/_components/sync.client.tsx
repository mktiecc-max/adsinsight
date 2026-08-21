"use client";

import {
  AlertTriangle,
  Beaker,
  Check,
  CheckCircle2,
  CircleStop,
  Database,
  FileSpreadsheet,
  Phone,
  Play,
  RefreshCw,
  Target,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { MetricValue } from "@/components/ui";
import { cn } from "@/lib/shared/utils";

const sourceIcons: Record<string, any> = {
  ads_daily: FileSpreadsheet,
  leads: Phone,
  crm_levels: Target,
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SyncClient({ initialHistory, initialSources }: { initialHistory: any[], initialSources: any[] }) {
  const [sources, setSources] = useState(initialSources);
  const [history, setHistory] = useState(initialHistory);
  const [syncing, setSyncing] = useState<string | null>(null); // source code being synced, or "all"
  const [lastResult, setLastResult] = useState<any>(null);

  const doSync = async (sourceCode?: string) => {
    const label = sourceCode || "all";
    setSyncing(label);
    setLastResult(null);

    try {
      const res = await fetch("/api/sync/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode }),
      });
      const data = await res.json();
      setLastResult(data);

      // Refresh history and sources
      const [histRes, srcRes] = await Promise.all([
        fetch("/api/sync/runs").then(r => r.json()),
        fetch("/api/settings/sources").then(r => r.json()),
      ]);
      if (histRes.data) setHistory(histRes.data);
      if (srcRes.data) setSources(srcRes.data);
    } catch (err) {
      setLastResult({ error: err instanceof Error ? err.message : "Lỗi không xác định" });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="page sync-page">
      <div className="desktop-required-note">
        <Database size={24} />
        <strong>Đồng bộ dữ liệu cần dùng máy tính</strong>
        <p>Mở trang này trên màn hình từ 768px để chạy thử hoặc ghi dữ liệu.</p>
      </div>

      <div className="desktop-admin-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow">Quản trị · Đồng bộ</div>
            <h1>Kiểm tra sạch rồi mới ghi dữ liệu</h1>
            <p>Ba nguồn chạy độc lập; chạy thử xử lý đủ nhưng không ghi vào bảng chính.</p>
          </div>
          <button
            className="button button-primary"
            onClick={() => doSync()}
            disabled={syncing !== null}
          >
            <RefreshCw size={14} className={syncing ? "spin" : ""} />
            {syncing ? "Đang đồng bộ…" : "Đồng bộ tất cả"}
          </button>
        </div>

        <section className="sync-source-grid">
          {sources.map((source: any) => {
            const Icon = sourceIcons[source.code] || Database;
            const isOk = source.last_status === "success";
            const isSyncing = syncing === source.code;
            return (
              <article className="card sync-source-card" key={source.code}>
                <div className="sync-source-head">
                  <span className="sync-source-icon"><Icon size={18} /></span>
                  <div>
                    <h2>{source.display_name}</h2>
                    <span className={cn("source-state", isOk ? "ok" : source.last_status ? "warn" : "")}>
                      {isOk ? <CheckCircle2 size={12} /> : source.last_status ? <AlertTriangle size={12} /> : null}
                      {source.last_sync_at ? formatTime(source.last_sync_at) : "Chưa đồng bộ"}
                    </span>
                  </div>
                </div>
                <div className="sync-source-count">
                  <MetricValue value={source.last_row_count || 0} kind="count" />
                  <span>dòng lần gần nhất</span>
                </div>
                <div className="sync-source-actions">
                  <button
                    className="button button-small button-primary"
                    onClick={() => doSync(source.code)}
                    disabled={syncing !== null}
                  >
                    {isSyncing ? <RefreshCw size={12} className="spin" /> : <Play size={12} />}
                    {isSyncing ? "Đang chạy…" : "Đồng bộ"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {lastResult ? (
          <section className={cn("card sync-run-card", lastResult.error ? "run-cancelled" : "run-success")}>
            <div className="sync-run-head">
              <div className="sync-run-icon">
                {lastResult.error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <div>
                <h2>{lastResult.error ? "Đồng bộ thất bại" : "Đồng bộ hoàn tất"}</h2>
                {lastResult.error ? (
                  <span>{lastResult.error}</span>
                ) : lastResult.results ? (
                  <span>
                    {lastResult.results.map((r: any) => `${r.code}: ${r.rows ?? 0} dòng`).join(" · ")}
                  </span>
                ) : null}
              </div>
              <button className="button button-small" onClick={() => setLastResult(null)}>Đóng</button>
            </div>
          </section>
        ) : null}

        <section className="card sync-history-card">
          <div className="card-header">
            <div className="card-title">Lịch sử đồng bộ <span className="card-subtitle">· 20 lần gần nhất</span></div>
          </div>
          <div className="sync-history-wrap">
            <table className="sync-history-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Nguồn</th>
                  <th>Chế độ</th>
                  <th>Kết quả</th>
                  <th>Thời lượng</th>
                  <th>Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>Chưa có lịch sử đồng bộ</td></tr>
                ) : history.map((item: any) => (
                  <tr key={item.id}>
                    <td className="num">{formatTime(item.started_at)}</td>
                    <td>{item.source?.display_name || "—"}</td>
                    <td><span className="sync-mode-badge">{item.mode}</span></td>
                    <td>
                      <span className={cn(item.status === "success" ? "metric-positive" : "metric-negative")}>
                        {item.status === "success" ? "Thành công" : item.status === "failed" ? "Lỗi" : item.status}
                      </span>
                      {item.rows_upserted > 0 && <span className="num"> · {item.rows_upserted} dòng</span>}
                    </td>
                    <td className="num">{formatDuration(item.started_at, item.finished_at)}</td>
                    <td>
                      <span className={cn("num", item.rows_error ? "metric-negative" : "metric-positive")}>
                        {item.rows_error || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
