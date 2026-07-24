"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricValue, SectionHeading, ZoneChip } from "@/components/ui";
import { zoneMeta } from "@/lib/domain/matrix";
import { sumPerformance } from "@/lib/domain/metrics";
import type { CalculatedPerformanceRow } from "@/lib/domain/types";
import { kpis, performanceRows, trendData } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Delta } from "@/components/ui";

type Kpi = {
  key: string;
  label: string;
  value: number;
  delta: number;
  quality: "good" | "bad" | "neutral";
  kind: "money" | "count" | "percent";
};

type TrendPoint = {
  day: string;
  spend: number;
  sql: number;
  cpsql: number;
};

function OverviewTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}/2026</strong>
      {payload.map((item) => (
        <div key={item.name}>
          <span style={{ background: item.color }} />
          {item.name}:{" "}
          <b className="num">
            {item.name === "Chi tiêu"
              ? `${(item.value / 1_000_000).toFixed(1).replace(".", ",")} Tr`
              : item.value.toLocaleString("vi-VN")}
          </b>
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const [aiGenerated, setAiGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rows, setRows] = useState<CalculatedPerformanceRow[]>(performanceRows);
  const [summaryKpis, setSummaryKpis] = useState<Kpi[]>([...kpis] as Kpi[]);
  const [series, setSeries] = useState<TrendPoint[]>(trendData);
  const [dataMode, setDataMode] = useState<"demo" | "live" | "error">("demo");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/report/summary", { signal: controller.signal, cache: "no-store" }),
      fetch("/api/report/performance?level=campaign&include_unrankable=true", {
        signal: controller.signal,
        cache: "no-store",
      }),
      fetch("/api/report/timeseries", { signal: controller.signal, cache: "no-store" }),
    ])
      .then(async ([summaryResponse, performanceResponse, trendResponse]) => {
        if (!summaryResponse.ok || !performanceResponse.ok || !trendResponse.ok) {
          throw new Error("Một API báo cáo không khả dụng.");
        }
        return Promise.all([
          summaryResponse.json() as Promise<{ data: { kpis: Kpi[] }; meta: { mode: "demo" | "live" } }>,
          performanceResponse.json() as Promise<{ data: CalculatedPerformanceRow[]; meta: { mode: "demo" | "live" } }>,
          trendResponse.json() as Promise<{ data: TrendPoint[]; meta: { mode: "demo" | "live" } }>,
        ]);
      })
      .then(([summary, performance, trend]) => {
        setSummaryKpis(summary.data.kpis);
        setRows(performance.data);
        setSeries(trend.data);
        setDataMode(
          summary.meta.mode === "live" && performance.meta.mode === "live" && trend.meta.mode === "live"
            ? "live"
            : "demo",
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDataMode("error");
      });
    return () => controller.abort();
  }, []);

  const totals = sumPerformance(rows);
  const topBest = rows
    .filter((row) => row.isRankable && (row.zone === "scale" || row.zone === "expensive"))
    .sort((a, b) => (a.cpsql ?? Infinity) - (b.cpsql ?? Infinity))
    .slice(0, 3);
  const topBad = rows
    .filter((row) => row.warning)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 3);
  const matrixRows = rows.filter((row) => row.isRankable).slice(0, 8);
  const cpsqlValues = matrixRows.map((row) => row.cpsql || 0);
  const escapeValues = matrixRows.map((row) => row.escapeRate || 0);
  const maxSpend = Math.max(1, ...matrixRows.map((row) => row.spend));
  const minCpsql = Math.min(...cpsqlValues, 0);
  const maxCpsql = Math.max(...cpsqlValues, 1);
  const minEscape = Math.min(...escapeValues, 0);
  const maxEscape = Math.max(...escapeValues, 1);
  const matrixPoints = matrixRows.map((row) => ({
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
    { label: "Bậc 1+", value: rows.reduce((sum, row) => sum + row.rank1, 0).toLocaleString("vi-VN"), sub: `${((totals.escapeRate || 0) * 100).toFixed(1).replace(".", ",")}% thoát bậc 0`, team: "Tư vấn" },
    { label: "Bậc 2+", value: totals.rank2.toLocaleString("vi-VN"), sub: "chuyển bậc", team: "Tư vấn" },
    { label: "Bậc 4", value: rows.reduce((sum, row) => sum + row.rank4, 0).toLocaleString("vi-VN"), sub: "cohort cuối phễu", team: "Tư vấn" },
  ];

  const generateSummary = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setAiGenerated(true);
      setGenerating(false);
    }, 850);
  };

  return (
    <div className="page overview-page">
      <div className="overview-data-mode">
        <span className={cn("data-mode-pill", `data-mode-${dataMode}`)}>
          {dataMode === "live" ? "Dữ liệu thật" : dataMode === "error" ? "Lỗi nguồn dữ liệu" : "Dữ liệu demo"}
        </span>
      </div>
      <div className="overview-alert">
        <div className="overview-alert-icon">
          <AlertTriangle size={17} />
        </div>
        <div>
          <strong>3 cảnh báo mức Cao</strong>
          <span> · ước tính </span>
          <b className="num">4,2 Tr đ</b>
          <span> chi phí vượt chuẩn</span>
        </div>
        <Link href="/alerts">
          Xem tất cả <ArrowRight size={14} />
        </Link>
      </div>

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
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 12, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#8d939c", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={6}
                />
                <YAxis hide yAxisId="spend" />
                <YAxis hide yAxisId="sql" orientation="right" />
                <Tooltip content={<OverviewTooltip />} />
                <Bar
                  yAxisId="spend"
                  dataKey="spend"
                  name="Chi tiêu"
                  fill="#bdd2e8"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={13}
                />
                <Line
                  yAxisId="sql"
                  dataKey="sql"
                  name="SQL"
                  type="monotone"
                  stroke="#d94949"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
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
              {matrixPoints.map(({ row, x, y, size, focus }) => (
                <Link
                  href={`/performance?detail=${row.id}`}
                  key={row.id}
                  className={cn("matrix-point", zoneMeta[row.zone].className, focus && "focus")}
                  style={{
                    left: `${x}%`,
                    bottom: `${y}%`,
                    width: size,
                    height: size,
                  }}
                  title={`${row.name} · ${zoneMeta[row.zone].label}`}
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
            {topBest.map((row, index) => (
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
            {topBad.map((row, index) => (
              <Link href={`/alerts#${row.id}`} key={row.id} className="ranking-row">
                <span className="ranking-index num">{index + 1}</span>
                <ZoneChip zone={row.zone} compact />
                <div>
                  <strong>{row.name}</strong>
                  <small>{row.warning} · CPSQL <MetricValue value={row.cpsql} kind="money" /></small>
                </div>
                <MetricValue
                  value={[2_400_000, 1_800_000, 680_000][index] ?? 0}
                  kind="money"
                  className="ranking-value metric-negative"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="card ai-panel">
        <div className="ai-panel-top">
          <div className="ai-icon"><Sparkles size={17} /></div>
          <div>
            <strong>Diễn giải phân tích</strong>
            <p>AI chỉ diễn giải các con số đã được hệ thống tính sẵn.</p>
          </div>
          <button
            className={cn("button", aiGenerated ? "" : "button-primary")}
            onClick={generateSummary}
            disabled={generating}
          >
            {generating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
            {generating ? "Đang tạo…" : aiGenerated ? "Tạo lại" : "Tạo diễn giải"}
          </button>
        </div>
        {aiGenerated ? (
          <div className="ai-summary">
            <p>
              Chi tiêu tăng <b className="num">12,3%</b> nhưng SQL giảm{" "}
              <b className="num">2,1%</b>, khiến CPSQL tăng mạnh{" "}
              <b className="num metric-negative">14,8%</b>. Vấn đề chính không nằm ở lượng tin nhắn
              mà ở hiệu quả lấy số và chất lượng sau khi có số.
            </p>
            <p>
              <b>ucmas / tuyển sinh hè</b> là bẫy số rẻ: CPSQL chỉ{" "}
              <b className="num">84 N</b> nhưng tỷ lệ thoát bậc 0 chỉ{" "}
              <b className="num metric-negative">18,2%</b>. Không tăng ngân sách; đội quảng cáo cần
              rà lại creative và tệp trước khi chạy tiếp.
            </p>
          </div>
        ) : (
          <div className="ai-placeholder">
            Bấm “Tạo diễn giải” để nhận tóm tắt 3–5 câu theo đúng khoảng ngày và bộ lọc hiện tại.
          </div>
        )}
      </section>
    </div>
  );
}
