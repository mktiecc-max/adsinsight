"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export function OverviewChartClient({ series }: { series: TrendPoint[] }) {
  return (
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
  );
}
