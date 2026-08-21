import Link from "next/link";
import { AlertTriangle, ArrowRight, ChevronRight } from "lucide-react";
import { MetricValue, SectionHeading, ZoneChip } from "@/components/ui";
import { zoneMeta } from "@/lib/domain/matrix";
import { sumPerformance } from "@/lib/domain/metrics";
import { detectAlerts } from "@/lib/domain/alerts";
import { cn } from "@/lib/shared/utils";
import { Delta } from "@/components/ui";
import { getLivePerformance, getLiveTimeseries } from "@/lib/infrastructure/repositories/report-repository";
import { AiSummaryPanelClient } from "./_components/ai-summary-panel.client";
import { OverviewChartClient } from "@/components/charts/overview-chart";
import type { CalculatedPerformanceRow, Zone } from "@/lib/domain/types";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : null;
  const to = typeof params.to === "string" ? params.to : null;
  
  // Parallel fetch on the server!
  const [rows, series] = await Promise.all([
    getLivePerformance({ from, to, level: "campaign" }),
    getLiveTimeseries({ from, to }),
  ]);

  const validRows = rows || [];
  const validSeries = series || [];
  const detectedAlerts = validRows.length > 0 ? detectAlerts(validRows) : [];
  const highAlerts = detectedAlerts.filter(a => a.severity === 'high');
  const totalOverspend = detectedAlerts.reduce((sum, a) => sum + (a.overspend || 0), 0);
  
  const totals = sumPerformance(validRows);
  
  const summaryKpis = [
    { key: "spend", label: "Chi tiêu", value: totals.spend, delta: 0, quality: "neutral" as const, kind: "money" as const },
    { key: "messages", label: "Tin nhắn", value: totals.messages, delta: 0, quality: "neutral" as const, kind: "count" as const },
    { key: "cpr", label: "CPR", value: totals.cpr || 0, delta: 0, quality: "neutral" as const, kind: "money" as const },
    { key: "sql", label: "SQL", value: totals.sql, delta: 0, quality: "neutral" as const, kind: "count" as const },
    { key: "capture", label: "Tỷ lệ lấy số", value: totals.captureRate || 0, delta: 0, quality: "neutral" as const, kind: "percent" as const },
    { key: "cpsql", label: "CPSQL", value: totals.cpsql || 0, delta: 0, quality: "neutral" as const, kind: "money" as const },
  ];

  const topBest = validRows
    .filter((row: CalculatedPerformanceRow) => row.isRankable && (row.zone === "scale" || row.zone === "expensive"))
    .sort((a: CalculatedPerformanceRow, b: CalculatedPerformanceRow) => (a.cpsql ?? Infinity) - (b.cpsql ?? Infinity))
    .slice(0, 3);
    
  const topBad = validRows
    .filter((row: CalculatedPerformanceRow) => row.warning)
    .sort((a: CalculatedPerformanceRow, b: CalculatedPerformanceRow) => b.spend - a.spend)
    .slice(0, 3);
    
  const matrixRows = validRows.filter((row: CalculatedPerformanceRow) => row.isRankable).slice(0, 8);
  const cpsqlValues = matrixRows.map((row: CalculatedPerformanceRow) => row.cpsql || 0);
  const escapeValues = matrixRows.map((row: CalculatedPerformanceRow) => row.escapeRate || 0);
  const maxSpend = Math.max(1, ...matrixRows.map((row: CalculatedPerformanceRow) => row.spend));
  const minCpsql = Math.min(...cpsqlValues, 0);
  const maxCpsql = Math.max(...cpsqlValues, 1);
  const minEscape = Math.min(...escapeValues, 0);
  const maxEscape = Math.max(...escapeValues, 1);
  
  const matrixPoints = matrixRows.map((row: CalculatedPerformanceRow) => ({
    row,
    x: 12 + (((row.cpsql || 0) - minCpsql) / Math.max(maxCpsql - minCpsql, 1)) * 76,
    y: 12 + (((row.escapeRate || 0) - minEscape) / Math.max(maxEscape - minEscape, 0.01)) * 76,
    size: 16 + (row.spend / maxSpend) * 18,
    focus: row.zone === "trap",
  }));
  
  const compactFunnel = [
    { label: "Chi tiêu", value: `${(totals.spend / 1_000_000).toFixed(1).replace(".", ",")} Tr`, sub: "", team: "" },
    { label: "Tin nhắn", value: totals.messages.toLocaleString("vi-VN"), sub: `CPR ${Math.round(totals.cpr || 0).toLocaleString("vi-VN")} đ`, team: "Meta / ads" },
    { label: "SQL", value: totals.sql.toLocaleString("vi-VN"), sub: `${((totals.captureRate || 0) * 100).toFixed(1).replace(".", ",")}% lấy số`, team: "Đội chat" },
    { label: "Bậc 1+", value: validRows.reduce((sum: number, row: CalculatedPerformanceRow) => sum + row.rank1, 0).toLocaleString("vi-VN"), sub: `${((totals.escapeRate || 0) * 100).toFixed(1).replace(".", ",")}% thoát bậc 0`, team: "Tư vấn" },
    { label: "Bậc 2+", value: totals.rank2.toLocaleString("vi-VN"), sub: "chuyển bậc", team: "Tư vấn" },
    { label: "Bậc 4", value: validRows.reduce((sum: number, row: CalculatedPerformanceRow) => sum + row.rank4, 0).toLocaleString("vi-VN"), sub: "cohort cuối phễu", team: "Tư vấn" },
  ];

  return (
    <div className="page overview-page">
      <div className="overview-data-mode"></div>
      
      {detectedAlerts.length > 0 && (
        <div className="overview-alert">
          <div className="overview-alert-icon">
            <AlertTriangle size={17} />
          </div>
          <div>
            <strong>{highAlerts.length} cảnh báo mức Cao</strong>
            <span> · ước tính </span>
            <b className="num"><MetricValue value={totalOverspend} kind="money" /></b>
            <span> chi phí vượt chuẩn</span>
          </div>
          <Link href="/alerts">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <section className="kpi-grid" aria-label="Chỉ số tổng quan">
        {summaryKpis.map((kpi) => (
          <article className="kpi-card card" key={kpi.key}>
            <div className="kpi-label">{kpi.label}</div>
            <MetricValue
              value={kpi.value}
              kind={kpi.kind}
              className="kpi-value"
            />
            <Delta value={kpi.delta} quality={kpi.quality} />
          </article>
        ))}
      </section>
      
      <p className="kpi-note">
        Mũi tên = hướng thay đổi · Màu = tốt hay xấu theo hướng riêng của từng chỉ số.
      </p>

      <section className="card compact-funnel-card">
        <SectionHeading title="Phễu chuyển đổi" subtitle="vấn đề nằm ở tầng nào?" />
        <div className="compact-funnel">
          {compactFunnel.map((step, index, all) => (
            <div className="compact-funnel-step" key={step.label}>
              <div className={cn("funnel-step-content", index === all.length - 1 && "immature")}>
                <span>{step.label}</span>
                <b className="num">{step.value}</b>
                <small>{step.sub || "\u00a0"}</small>
                <em title="Bộ phận chịu trách nhiệm">{step.team || "\u00a0"}</em>
              </div>
              {index < all.length - 1 ? <ChevronRight size={17} /> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="overview-two-columns">
        <section className="card chart-card">
          <SectionHeading
            title="Xu hướng theo ngày"
            action={
              <div className="chart-legend">
                <span><i className="legend-bar" /> Chi tiêu</span>
                <span><i className="legend-line" /> SQL</span>
              </div>
            }
          />
          <div className="overview-chart">
            <OverviewChartClient series={validSeries} />
          </div>
        </section>

        <section className="card matrix-card">
          <SectionHeading
            title="Ma trận 2 trục"
            action={<span className="card-subtitle">chấm = chi tiêu · nét đứt = trung vị</span>}
          />
          <div className="matrix-wrap">
            <div className="matrix-plot">
              <div className="quadrant quadrant-scale"><span>Nhân rộng</span></div>
              <div className="quadrant quadrant-expensive"><span>Đúng tệp nhưng đắt</span></div>
              <div className="quadrant quadrant-trap"><span>Bẫy số rẻ</span></div>
              <div className="quadrant quadrant-stop"><span>Dừng</span></div>
              <div className="matrix-vline" />
              <div className="matrix-hline" />
              {matrixPoints.map(({ row, x, y, size, focus }: any) => (
                <Link
                  href={`/performance?detail=${row.id}`}
                  key={row.id}
                  className={cn("matrix-point", zoneMeta[row.zone as Zone].className, focus && "focus")}
                  style={{
                    left: `${x}%`,
                    bottom: `${y}%`,
                    width: size,
                    height: size,
                  }}
                  title={`${row.name} · ${zoneMeta[row.zone as Zone].label}`}
                />
              ))}
            </div>
            <div className="matrix-axis">
              <span>← CPSQL rẻ</span>
              <span>Tỷ lệ thoát bậc 0 ↑</span>
              <span>CPSQL đắt →</span>
            </div>
          </div>
        </section>
      </div>

      <div className="overview-two-columns overview-rankings">
        <section className="card">
          <SectionHeading title="Top tốt nhất" subtitle="CPSQL tăng dần, bỏ cỡ mẫu nhỏ" />
          <div className="ranking-list">
            {topBest.map((row: CalculatedPerformanceRow, index: number) => (
              <Link href={`/performance?detail=${row.id}`} key={row.id} className="ranking-row">
                <span className="ranking-index num">{index + 1}</span>
                <ZoneChip zone={row.zone} compact />
                <div>
                  <strong>{row.name}</strong>
                  <small>Thoát bậc 0: <MetricValue value={row.escapeRate} kind="percent" /></small>
                </div>
                <MetricValue value={row.cpsql} kind="money" className="ranking-value" />
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <SectionHeading title="Top cần xử lý" subtitle="chi phí vượt chuẩn giảm dần" />
          <div className="ranking-list">
            {topBad.map((row: CalculatedPerformanceRow, index: number) => (
              <Link href={`/alerts#${row.id}`} key={row.id} className="ranking-row">
                <span className="ranking-index num">{index + 1}</span>
                <ZoneChip zone={row.zone} compact />
                <div>
                  <strong>{row.name}</strong>
                  <small>{row.warning || "Cần tối ưu"} · CPSQL <MetricValue value={row.cpsql} kind="money" /></small>
                </div>
                <MetricValue
                  value={row.spend * 0.2}
                  kind="money"
                  className="ranking-value metric-negative"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <AiSummaryPanelClient />
    </div>
  );
}
