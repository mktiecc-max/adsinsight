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
import { useEffect, useRef, useState } from "react";
import { MetricValue } from "@/components/ui";
import { cn } from "@/lib/utils";

const syncHistory: any[] = [];
const syncSources: any[] = [];

type RunState = {
  id: string;
  source: string;
  mode: "dry_run" | "commit";
  progress: number;
  processed: number;
  total: number;
  errors: number;
  status: "running" | "success" | "cancelled";
};

const sourceIcons = {
  ads_daily: FileSpreadsheet,
  leads: Phone,
  crm_levels: Target,
};

export default function SyncPage() {
  const [run, setRun] = useState<RunState | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    cancelledRef.current = true;
  }, []);

  const startRun = async (
    source: string,
    mode: "dry_run" | "commit",
    sourceId = "all",
  ) => {
    cancelledRef.current = false;
    const startResponse = await fetch("/api/sync/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: sourceId, mode }),
    });
    const startPayload = await startResponse.json();
    if (!startResponse.ok) {
      setRun({
        id: startPayload.run?.id || "error",
        source,
        mode,
        progress: 0,
        processed: 0,
        total: startPayload.run?.total || 0,
        errors: 1,
        status: "cancelled",
      });
      return;
    }

    const runId = startPayload.data.id as string;
    const total = Number(startPayload.data.total || 0);
    setRun({ id: runId, source, mode, progress: 0, processed: 0, total, errors: 0, status: "running" });

    let done = false;
    while (!done && !cancelledRef.current) {
      const stepResponse = await fetch("/api/sync/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });
      const stepPayload = await stepResponse.json();
      if (!stepResponse.ok) throw new Error(stepPayload.error || "Bước đồng bộ thất bại.");
      const item = stepPayload.data;
      done = Boolean(item.done);
      setRun({
        id: runId,
        source,
        mode,
        progress: Math.round(Number(item.progress || 0) * 100),
        processed: Number(item.cursor || 0),
        total: Number(item.total || total),
        errors: Number(item.rows_error ?? item.errors ?? 0),
        status: "running",
      });
      if (!done) await new Promise((resolve) => window.setTimeout(resolve, 120));
    }

    if (done && !cancelledRef.current) {
      const finishResponse = await fetch("/api/sync/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });
      const finishPayload = await finishResponse.json();
      if (!finishResponse.ok) throw new Error(finishPayload.error || "Không thể hoàn tất phiên.");
      setRun((current) => current ? { ...current, progress: 100, processed: current.total, status: "success" } : null);
    }
  };

  const safelyStartRun = (
    source: string,
    mode: "dry_run" | "commit",
    sourceId = "all",
  ) => {
    void startRun(source, mode, sourceId).catch(() => {
      setRun((current) =>
        current ? { ...current, errors: Math.max(1, current.errors), status: "cancelled" } : null,
      );
    });
  };

  const cancel = async () => {
    cancelledRef.current = true;
    if (run?.id) {
      await fetch("/api/sync/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: run.id }),
      });
    }
    setRun((current) => current ? { ...current, status: "cancelled" } : null);
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
            onClick={() => safelyStartRun("Tất cả", "commit")}
            disabled={run?.status === "running"}
          >
            <RefreshCw size={14} className={run?.status === "running" ? "spin" : ""} />
            Đồng bộ tất cả
          </button>
        </div>

        <section className="sync-source-grid">
          {syncSources.map((source) => {
            const Icon = sourceIcons[source.code as keyof typeof sourceIcons];
            return (
              <article className="card sync-source-card" key={source.code}>
                <div className="sync-source-head">
                  <span className="sync-source-icon"><Icon size={18} /></span>
                  <div>
                    <h2>{source.name}</h2>
                    <span className={cn("source-state", source.state === "ok" ? "ok" : "warn")}>
                      {source.state === "ok" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {source.updated}
                    </span>
                  </div>
                </div>
                <div className="sync-source-count">
                  <MetricValue value={source.rows} kind="count" />
                  <span>dòng lần gần nhất</span>
                </div>
                <div className="sync-source-actions">
                  <button
                    className="button button-small"
                    onClick={() => safelyStartRun(source.name, "dry_run", source.code)}
                    disabled={run?.status === "running"}
                  >
                    <Beaker size={13} /> Chạy thử
                  </button>
                  <button
                    className="button button-small button-primary"
                    onClick={() => safelyStartRun(source.name, "commit", source.code)}
                    disabled={run?.status === "running"}
                  >
                    <Play size={12} /> Đồng bộ
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {run ? (
          <section className={cn("card sync-run-card", `run-${run.status}`)}>
            <div className="sync-run-head">
              <div className="sync-run-icon">
                {run.status === "running" ? <RefreshCw size={18} className="spin" /> : run.status === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
              <div>
                <h2>
                  {run.status === "running"
                    ? `${run.mode === "dry_run" ? "Đang chạy thử" : "Đang đồng bộ"} ${run.source}…`
                    : run.status === "success"
                      ? `${run.mode === "dry_run" ? "Chạy thử" : "Đồng bộ"} hoàn tất`
                      : "Đã hủy phiên đồng bộ"}
                </h2>
                <span>
                  {run.mode === "dry_run" ? "Không ghi dữ liệu" : "Ghi theo transaction khi tất cả bước hợp lệ"}
                </span>
              </div>
              {run.status === "running" ? (
                <button className="button button-small button-danger" onClick={() => void cancel()}>
                  <CircleStop size={13} /> Hủy
                </button>
              ) : (
                <button className="button button-small" onClick={() => setRun(null)}>Đóng</button>
              )}
            </div>
            <div className="sync-progress-track">
              <i style={{ width: `${run.progress}%` }} />
            </div>
            <div className="sync-progress-meta">
              <b className="num">{run.progress}%</b>
              <span className="num">{run.processed.toLocaleString("vi-VN")} / {run.total.toLocaleString("vi-VN")} dòng</span>
              <span className="sync-ok"><Check size={12} /> Hợp lệ <b className="num">{Math.max(0, run.processed - run.errors).toLocaleString("vi-VN")}</b></span>
              <span className="sync-errors"><AlertTriangle size={12} /> Lỗi <b className="num">{run.errors}</b></span>
            </div>
            {run.status === "success" ? (
              <div className="sync-result">
                <div>
                  <span>Lead mới</span><b className="num">87</b>
                </div>
                <div>
                  <span>Thay đổi bậc</span><b className="num">34</b>
                </div>
                <div>
                  <span>Lead có quảng cáo</span><b className="num">78,4%</b>
                </div>
                <div>
                  <span>Khớp CRM</span><b className="num">12,6%</b>
                </div>
              </div>
            ) : null}
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
                {syncHistory.map((item) => (
                  <tr key={`${item.time}-${item.source}`}>
                    <td className="num">{item.time}</td>
                    <td>{item.source}</td>
                    <td><span className="sync-mode-badge">{item.mode}</span></td>
                    <td>{item.result}</td>
                    <td className="num">{item.duration}</td>
                    <td>
                      <span className={cn("num", item.errors ? "metric-negative" : "metric-positive")}>
                        {item.errors}
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
