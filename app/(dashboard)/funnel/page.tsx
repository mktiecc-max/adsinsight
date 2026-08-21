"use client";

import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  Phone,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MetricValue, SectionHeading } from "@/components/ui";
const funnelSteps: any[] = [];
const ownerCapture: any[] = [];
const brandLevels: any[] = [];
const dataHealth: any[] = [];
import { cn } from "@/lib/utils";

export default function FunnelPage() {
  const [report, setReport] = useState({
    steps: [...funnelSteps],
    capture_by_owner: [...ownerCapture],
    level_distribution: [...brandLevels],
    health: [...dataHealth],
  });
  const [dataMode, setDataMode] = useState<"demo" | "live" | "error">("demo");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/report/funnel", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{
          data: typeof report;
          meta: { mode: "demo" | "live" };
        }>;
      })
      .then((payload) => {
        setReport(payload.data);
        setDataMode(payload.meta.mode);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDataMode("error");
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="page funnel-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Phễu & chất lượng</div>
          <h1>Mỗi điểm rơi, đúng một bộ phận chịu trách nhiệm</h1>
          <p>
            Tách hiệu quả quảng cáo, khả năng lấy số của đội chat và chất lượng xử lý của đội tư vấn.
          </p>
        </div>
        <div className="maturity-badge">
          <ShieldCheck size={15} />
          Cohort bậc 3–4 còn <b className="num">38 ngày</b> để chín
        </div>

      </div>

      <section className="card big-funnel-card">
        <SectionHeading
          title="Phễu chuyển đổi"
          subtitle="01/06–30/06/2026"
          action={<span className="card-subtitle">Tỷ lệ = bước hiện tại ÷ bước trước</span>}
        />
        <div className="big-funnel">
          {report.steps.map((step, index) => {
            const width = index === 0 ? 100 : Math.max(4, (step.value / report.steps[0].value) * 100);
            const Icon = index === 0 ? MessageCircle : index === 1 ? Phone : Target;
            return (
              <div className={cn("big-funnel-row", step.immature && "immature")} key={step.label}>
                <div className="funnel-label">
                  <Icon size={15} />
                  <span>{step.label}</span>
                </div>
                <MetricValue value={step.value} kind="count" className="funnel-count" />
                <div className="funnel-bar-track">
                  <div style={{ width: `${width}%` }} />
                </div>
                <MetricValue value={step.rate} kind="percent" className="funnel-rate" />
                <div className="funnel-owner">
                  {step.owner ? (
                    <>
                      <ArrowDown size={11} />
                      {step.owner}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="responsibility-strip">
          <div><span className="responsibility-icon ads"><MessageCircle size={15} /></span><b>Quảng cáo</b><small>CPR · tin nhắn</small></div>
          <div><span className="responsibility-icon chat"><Phone size={15} /></span><b>Đội chat</b><small>Tỷ lệ lấy số</small></div>
          <div><span className="responsibility-icon sales"><UsersRound size={15} /></span><b>Đội tư vấn</b><small>Chuyển bậc</small></div>
        </div>
      </section>

      <div className="funnel-two-columns">
        <section className="card capture-card">
          <SectionHeading title="Tỷ lệ lấy số theo người chạy" subtitle="đường nét đứt = trung vị 33,2%" />
          <div className="capture-bars">
            <div className="capture-median" style={{ left: "73.8%" }} />
            {report.capture_by_owner.map((owner) => (
              <div className="capture-row" key={owner.name}>
                <span>{owner.name}</span>
                <div><i style={{ width: `${(owner.value / 0.45) * 100}%` }} /></div>
                <MetricValue value={owner.value} kind="percent" />
              </div>
            ))}
          </div>
          <div className="auto-conclusion">
            <CheckCircle2 size={17} />
            <div>
              <strong>Kết luận tự động</strong>
              <p>
                Độ lệch tập trung ở <b>linhpt</b> và <b>ngocanh</b>, không xuất hiện đều toàn tài khoản.
                Ưu tiên soi tệp/creative của hai nhóm trước khi đổi kịch bản chat.
              </p>
            </div>
          </div>
        </section>

        <section className="card">
          <SectionHeading title="Phân bố bậc theo brand" subtitle="% trên tổng SQL" />
          <div className="brand-levels">
            {report.level_distribution.map((brand) => (
              <div key={brand.brand} className="brand-level-row">
                <div className="brand-level-head">
                  <strong>{brand.brand}</strong>
                  <span className="num">100%</span>
                </div>
                <div className="stacked-level-bar">
                  {[brand.rank0, brand.rank1, brand.rank2, brand.rank3, brand.rank4].map((value, rank) => (
                    <span key={rank} className={`level-${rank}`} style={{ width: `${value}%` }} title={`Bậc ${rank}: ${value}%`}>
                      {value >= 8 ? <small className="num">{value}%</small> : null}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="level-legend">
              {[0, 1, 2, 3, 4].map((rank) => (
                <span key={rank}><i className={`level-${rank}`} /> Bậc {rank}</span>
              ))}
            </div>
          </div>
          <div className="quality-comparison">
            <div>
              <span>Quảng cáo</span>
              <b className="num">412 SQL</b>
              <small>Thoát bậc 0 <strong className="num">48,1%</strong></small>
            </div>
            <div className="vs">vs</div>
            <div>
              <span>Organic</span>
              <b className="num">113 SQL</b>
              <small>Thoát bậc 0 <strong className="num">55,8%</strong></small>
            </div>
          </div>
        </section>
      </div>

      <section className="card health-card">
        <SectionHeading
          title="Sức khỏe dữ liệu"
          subtitle="cảnh báo sớm trước khi báo cáo sai"
          action={
            <span className="health-state">
              <span /> Đủ để phân tích
            </span>
          }
        />
        <div className="health-grid">
          {report.health.map((item) => (
            <div className="health-metric" key={item.label}>
              <div className="health-label">
                <span>{item.label}</span>
                {item.info ? (
                  <span title="CRM không có cột ngày; chỉ tính được khách có trong POSCAKE">
                    <HelpCircle size={12} />
                  </span>
                ) : null}
              </div>
              <div className="health-value-line">
                <MetricValue value={item.value} kind="percent" />
                <small>kỳ trước <MetricValue value={"previous" in item ? item.previous ?? null : null} kind="percent" /></small>
              </div>
              <div className="health-track">
                <i className={`health-${item.tone}`} style={{ width: `${Math.max(item.value * 100, 2)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="health-note">
          <AlertTriangle size={14} />
          Tỷ lệ khớp CRM đang thấp nhưng trên ngưỡng cảnh báo 10%. Nếu xuống dưới ngưỡng, toàn bộ tầng chất lượng sẽ được đánh dấu không đủ dữ liệu.
        </div>
      </section>
    </div>
  );
}
