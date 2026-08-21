"use client";

import Link from "next/link";
import { AlertCircle, BellOff, Check, Clock3, ExternalLink, Filter, Info } from "lucide-react";
import { useState } from "react";
import { MetricValue } from "@/components/ui";
import { cn } from "@/lib/utils";

const filters = [
  ["all", "Tất cả"],
  ["high", "Cao"],
  ["medium", "Trung bình"],
  ["low", "Thấp"],
] as const;

const severityMeta = {
  high: { label: "Cao", className: "severity-high" },
  medium: { label: "Trung bình", className: "severity-medium" },
  low: { label: "Thấp", className: "severity-low" },
};

export function AlertsClient({ initialAlerts }: { initialAlerts: any[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const rows = initialAlerts;

  const visible = rows.filter((alert) => filter === "all" || alert.severity === filter);

  return (
    <div className="page alerts-page">
      <div className="page-heading alerts-heading">
        <div>
          <div className="eyebrow">Cảnh báo</div>
          <h1>Ưu tiên theo số tiền có thể tiết kiệm</h1>
          <p>Mỗi cảnh báo gồm bằng chứng, trung vị để so và hành động cụ thể — không báo chung chung.</p>
        </div>
        <div className="alerts-total">
          <span>Vượt chuẩn ước tính</span>
          <MetricValue value={4_880_000} kind="money" />
        </div>
      </div>

      <div className="alert-filter-bar">
        <Filter size={14} />
        <div>
          {filters.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id as any)} className={cn(filter === id && "active")}>
              {id !== "all" ? <span className={`filter-dot severity-${id}`} /> : null}
              {label}
              {id === "all" ? <span className="num">{rows.length}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="alert-list">
        {visible.map((alert: any) => {
          const meta = severityMeta[alert.severity as keyof typeof severityMeta] || { label: "Khác", className: "" };
          const isSnoozed = snoozed.includes(alert.id);
          return (
            <article className={cn("alert-card card", meta.className, isSnoozed && "snoozed")} key={alert.id}>
              <div className="alert-accent" />
              <div className="alert-card-top">
                <span className="alert-severity">
                  <i /> {meta.label}
                </span>
                <h2>{alert.label}</h2>
                <div className="alert-overspend">
                  <span>Vượt chuẩn</span>
                  <MetricValue value={alert.overspend || null} kind="money" />
                </div>
              </div>
              <div className="alert-object">{alert.object}</div>

              <div className="alert-evidence">
                {alert.evidence.map((evidence: any) => (
                  <div key={evidence.label}>
                    <span>{evidence.label}</span>
                    <b className={cn("num", `metric-${evidence.quality === "good" ? "positive" : evidence.quality === "bad" ? "negative" : "neutral"}`)}>
                      {evidence.value}
                    </b>
                    <small>({evidence.reference})</small>
                  </div>
                ))}
              </div>

              <div className="alert-action">
                <AlertCircle size={15} />
                <p>{alert.action}</p>
              </div>

              <div className="alert-card-actions">
                {isSnoozed ? <span className="snoozed-label"><Check size={13} /> Đã bỏ qua đến 31/07</span> : null}
                <Link href={`/performance?detail=${alert.id}`} className="button button-small">
                  Xem chi tiết <ExternalLink size={12} />
                </Link>
                <button
                  className="button button-small"
                  onClick={() => setSnoozed((current) => (current.includes(alert.id) ? current.filter((id) => id !== alert.id) : [...current, alert.id]))}
                >
                  <Clock3 size={12} /> {isSnoozed ? "Bật lại" : "Bỏ qua 7 ngày"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="disabled-rules">
        <div className="disabled-rules-icon">
          <BellOff size={18} />
        </div>
        <div>
          <strong>3 quy tắc chưa chạy được</strong>
          <p>Bão hòa tệp · Creative mòn · Đấu giá đắt lên</p>
          <small>Cần bổ sung vào nguồn quảng cáo: <code>impressions</code>, <code>clicks</code>, <code>frequency</code></small>
        </div>
        <Info size={15} />
      </section>
    </div>
  );
}
