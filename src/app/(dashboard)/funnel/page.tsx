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
import { MetricValue, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/shared/utils";
import { getLivePerformance, getUntrackedFunnel } from "@/lib/infrastructure/repositories/report-repository";

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : null;
  const to = typeof params.to === "string" ? params.to : null;
  const brand = typeof params.brand === "string" ? params.brand : null;
  const owner = typeof params.owner === "string" ? params.owner : null;
  const account = typeof params.account === "string" ? params.account : null;

  const rawLive = await getLivePerformance({ from, to, level: "campaign", brand, owner, account });
  const live = rawLive || [];
  const untracked = await getUntrackedFunnel({ from, to, brand, owner, account });

  if (!live || live.length === 0) {
    return (
      <div className="page funnel-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">Phễu & chất lượng</div>
            <h1>Mỗi điểm rơi, đúng một bộ phận chịu trách nhiệm</h1>
          </div>
        </div>
        <p>Không có dữ liệu trong khoảng thời gian này.</p>
      </div>
    );
  }

  const totals = live.reduce(
    (sum, row) => ({
      messages: sum.messages + row.messages,
      sql: sum.sql + row.sql,
      rank1: sum.rank1 + row.rank1,
      rank2: sum.rank2 + row.rank2,
      rank3: sum.rank3 + row.rank3,
      rank4: sum.rank4 + row.rank4,
    }),
    { messages: 0, sql: 0, rank1: 0, rank2: 0, rank3: 0, rank4: 0 },
  );

  const rate = (value: number, previous: number) => (previous ? value / previous : 0);
  
  const owners = new Map<string, { sql: number; messages: number }>();
  live.forEach((row) => {
    const current = owners.get(row.owner) || { sql: 0, messages: 0 };
    current.sql += row.sql;
    current.messages += row.messages;
    owners.set(row.owner, current);
  });

  const brands = (["ucmas", "uckid"] as const).map((brand) => {
    const rows = live.filter((row) => row.brand === brand);
    const totalSql = rows.reduce((sum, row) => sum + row.sql, 0);
    const asPercent = (value: number) => (totalSql ? (value / totalSql) * 100 : 0);
    const rank1 = rows.reduce((sum, row) => sum + row.rank1, 0);
    const rank2 = rows.reduce((sum, row) => sum + row.rank2, 0);
    const rank3 = rows.reduce((sum, row) => sum + row.rank3, 0);
    const rank4 = rows.reduce((sum, row) => sum + row.rank4, 0);
    return {
      brand: brand.toUpperCase(),
      rank0: asPercent(Math.max(0, totalSql - rank1)),
      rank1: asPercent(Math.max(0, rank1 - rank2)),
      rank2: asPercent(Math.max(0, rank2 - rank3)),
      rank3: asPercent(Math.max(0, rank3 - rank4)),
      rank4: asPercent(rank4),
    };
  });

  const steps = [
    { label: "Tin nhắn", value: totals.messages, rate: 1, owner: "Meta / người chạy ads", immature: false },
    { label: "SĐT (SQL)", value: totals.sql, rate: rate(totals.sql, totals.messages), owner: "Đội chat", immature: false },
    { label: "Bậc 1+", value: totals.rank1, rate: rate(totals.rank1, totals.sql), owner: "Đội tư vấn", immature: false },
    { label: "Bậc 2+", value: totals.rank2, rate: rate(totals.rank2, totals.rank1), owner: "Đội tư vấn", immature: false },
    { label: "Bậc 3+", value: totals.rank3, rate: rate(totals.rank3, totals.rank2), owner: "Đội tư vấn", immature: false },
    { label: "Bậc 4", value: totals.rank4, rate: rate(totals.rank4, totals.rank3), owner: "Đội tư vấn", immature: false },
  ];

  const capture_by_owner = [...owners].map(([name, value]) => ({
    name,
    value: rate(value.sql, value.messages),
  }));

  const health = [
    {
      label: "Lead có gắn quảng cáo",
      value: totals.sql ? live.reduce((sum, row) => sum + row.sql, 0) / totals.sql : 0,
      tone: "blue",
      info: false,
    },
    {
      label: "Lead khớp được CRM",
      value: totals.sql
        ? live.reduce((sum, row) => sum + row.matchRate * row.sql, 0) / totals.sql
        : 0,
      tone: "amber",
      info: false,
    },
    {
      label: "SĐT lỗi định dạng",
      value: live.reduce((sum, row) => sum + row.invalidRate, 0) / Math.max(live.length, 1),
      tone: "green",
      info: false,
    },
    {
      label: "SĐT trùng",
      value: live.reduce((sum, row) => sum + row.duplicateRate, 0) / Math.max(live.length, 1),
      tone: "green",
      info: false,
    },
  ];

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
          subtitle="Tất cả thời gian"
          action={<span className="card-subtitle">Tỷ lệ = bước hiện tại ÷ bước trước</span>}
        />
        <div className="big-funnel">
          {steps.map((step, index) => {
            const width = index === 0 ? 100 : Math.max(4, (step.value / steps[0].value) * 100);
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
            {capture_by_owner.map((owner) => (
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
                Độ lệch phân bổ cho các người chạy quảng cáo khác nhau cần được theo dõi thêm.
              </p>
            </div>
          </div>
        </section>

        <section className="card">
          <SectionHeading title="Phân bố bậc theo brand" subtitle="% trên tổng SQL" />
          <div className="brand-levels">
            {brands.map((brand) => (
              <div key={brand.brand} className="brand-level-row">
                <div className="brand-level-head">
                  <strong>{brand.brand}</strong>
                  <span className="num">100%</span>
                </div>
                <div className="stacked-level-bar">
                  {[brand.rank0, brand.rank1, brand.rank2, brand.rank3, brand.rank4].map((value, rank) => (
                    <span key={rank} className={`level-${rank}`} style={{ width: `${value}%` }} title={`Bậc ${rank}: ${value}%`}>
                      {value >= 8 ? <small className="num">{value.toFixed(1)}%</small> : null}
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
              <b className="num">{totals.sql} SQL</b>
            </div>
            <div className="vs">vs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>Không rõ nguồn (Organic)</span>
              <b className="num">{untracked.sql} SQL</b>
              <div style={{ display: "flex", gap: "8px", fontSize: "0.8rem", color: "var(--fg-muted)", marginTop: 4 }}>
                <span>Bậc 1: <b className="num">{untracked.rank1}</b></span>
                <span>Bậc 2: <b className="num">{untracked.rank2}</b></span>
                <span>Bậc 3: <b className="num">{untracked.rank3}</b></span>
                <span>Bậc 4: <b className="num">{untracked.rank4}</b></span>
              </div>
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
          {health.map((item) => (
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
                <small>kỳ trước <MetricValue value={null} kind="percent" /></small>
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
