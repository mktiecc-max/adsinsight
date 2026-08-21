"use client";

import {
  ArrowDownToLine,
  ArrowUpDown,
  Check,
  ChevronDown,
  Columns3,
  Info,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGlobalFilters } from "@/components/app-shell";
import { MetricValue, SampleWarning, ZoneChip } from "@/components/ui";
import { zoneMeta } from "@/lib/domain/matrix";
import type { CalculatedPerformanceRow, Zone } from "@/lib/domain/types";
import { formatCount, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

const levels = [
  ["campaign", "Chiến dịch"],
  ["adset", "Nhóm QC"],
  ["ad", "Quảng cáo"],
  ["creative", "Creative"],
  ["owner", "Người chạy"],
  ["brand", "Brand"],
] as const;

function HeatCell({
  value,
  max,
  kind,
  tone,
}: {
  value: number;
  max: number;
  kind: "money" | "count";
  tone: "blue" | "green";
}) {
  return (
    <div className="heat-cell">
      <span
        className={cn("heat-bar", `heat-${tone}`)}
        style={{ width: `${Math.max(3, (value / max) * 100)}%` }}
      />
      <MetricValue value={value} kind={kind} />
    </div>
  );
}

function MetricCell({
  value,
  kind,
  quality,
  warning,
}: {
  value: number | null;
  kind: "money" | "count" | "percent";
  quality?: "good" | "bad" | "neutral";
  warning?: string;
}) {
  return (
    <div className={cn("table-metric", quality && `metric-${quality === "good" ? "positive" : quality === "bad" ? "negative" : "neutral"}`)}>
      <MetricValue value={value} kind={kind} />
      {warning ? <span className="cell-warning" title={warning}>!</span> : null}
    </div>
  );
}

function DetailDrawer({
  row,
  onClose,
}: {
  row: CalculatedPerformanceRow;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("metrics");
  const advisoryFactor = row.stepRate2 ? 1 / row.stepRate2 : null;
  const captureFactor = row.captureRate ? 1 / row.captureRate : null;
  const diagnosis =
    row.escapeRate !== null && row.escapeRate < 0.3
      ? "ĐỘI TƯ VẤN"
      : row.captureRate !== null && row.captureRate < 0.28
        ? "ĐỘI CHAT"
        : row.cpr !== null && row.cpr > 41_000
          ? "QUẢNG CÁO"
          : "KHÔNG CÓ ĐIỂM NGHẼN LỚN";

  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label={`Chi tiết ${row.name}`}>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Đóng chi tiết" />
      <aside className="detail-drawer">
        <div className="drawer-header">
          <div>
            <div className="eyebrow">Chi tiết chiến dịch</div>
            <h2>{row.name}</h2>
            <div className="drawer-meta">
              <span>{row.owner}</span><i /> <span>{row.brand}</span><i /> <span>{row.objective}</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-zone">
          <ZoneChip zone={row.zone} />
          <span>{zoneMeta[row.zone as Zone].action}</span>
        </div>

        <div className="diagnostic-card">
          <div className="diagnostic-label">Phân rã chẩn đoán</div>
          <div className="diagnostic-formula-title">
            CP_L2 = CPR × 1/lấy số × 1/chuyển bậc
          </div>
          <div className="diagnostic-formula">
            <div>
              <MetricValue value={row.cpL2} kind="money" />
              <small>CP_L2</small>
            </div>
            <span>=</span>
            <div className={cn(row.cpr && row.cpr > 41_000 ? "factor-bad" : "factor-good")}>
              <MetricValue value={row.cpr} kind="money" />
              <small>Meta / creative</small>
            </div>
            <span>×</span>
            <div className={cn(row.captureRate && row.captureRate < 0.28 ? "factor-bad" : "factor-good")}>
              <span className="num">{captureFactor?.toFixed(2).replace(".", ",") ?? "—"}</span>
              <small>Đội chat</small>
            </div>
            <span>×</span>
            <div className={cn(row.stepRate2 && row.stepRate2 < 0.45 ? "factor-bad" : "factor-good")}>
              <span className="num">{advisoryFactor?.toFixed(2).replace(".", ",") ?? "—"}</span>
              <small>Đội tư vấn</small>
            </div>
          </div>
          <div className="diagnostic-conclusion">
            <span>→</span> Vấn đề nằm ở <strong>{diagnosis}</strong>
          </div>
        </div>

        <div className="drawer-tabs">
          {[
            ["metrics", "Chỉ số"],
            ["ranks", "Phân bố bậc"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={cn(tab === id && "active")}>
              {label}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {tab === "metrics" ? (
            <div className="drawer-metrics-grid">
              {[
                ["Chi tiêu", row.spend, "money"],
                ["Tin nhắn", row.messages, "count"],
                ["CPR", row.cpr, "money"],
                ["SQL", row.sql, "count"],
                ["Tỷ lệ lấy số", row.captureRate, "percent"],
                ["CPSQL", row.cpsql, "money"],
                ["Thoát bậc 0", row.escapeRate, "percent"],
                ["CP_L2", row.cpL2, "money"],
                ["Khớp CRM", row.matchRate, "percent"],
              ].map(([label, value, kind]) => (
                <div key={label as string}>
                  <span>{label}</span>
                  <MetricValue value={value as number | null} kind={kind as "money" | "count" | "percent"} />
                </div>
              ))}
            </div>
          ) : null}

          {tab === "ranks" ? (
            <div className="rank-distribution">
              {[
                ["Bậc 0", row.sql - row.rank1, row.sql],
                ["Bậc 1+", row.rank1, row.sql],
                ["Bậc 2+", row.rank2, row.sql],
                ["Bậc 3+", row.rank3, row.sql],
                ["Bậc 4", row.rank4, row.sql],
              ].map(([label, value, total]) => (
                <div key={label as string}>
                  <span>{label}</span>
                  <div><i style={{ width: `${((value as number) / (total as number)) * 100}%` }} /></div>
                  <b className="num">{value as number}</b>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function PerformanceClient({ initialRows }: { initialRows: CalculatedPerformanceRow[] }) {
  const searchParams = useSearchParams();
  const { brand, owner } = useGlobalFilters();
  const [level, setLevel] = useState("campaign");
  const [rows, setRows] = useState<CalculatedPerformanceRow[]>(initialRows);
  const [showSmall, setShowSmall] = useState(false);
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "cpsql", desc: false }]);
  const [columnPicker, setColumnPicker] = useState(false);
  const [selected, setSelected] = useState<CalculatedPerformanceRow | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    cpm: false,
    ctr: false,
    frequency: false,
    matchRate: false,
  });
  const pickerRef = useRef<HTMLDivElement>(null);

  // Still fetching for level changes
  useEffect(() => {
    if (level === "campaign" && initialRows.length > 0) {
      setRows(initialRows);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      level,
      include_unrankable: "true",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
    });
    fetch(`/api/report/performance?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => setRows(payload.data))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [level, initialRows, searchParams]);

  useEffect(() => {
    const detail = searchParams.get("detail");
    if (detail) setSelected(rows.find((row) => row.id === detail) ?? null);
  }, [searchParams, rows]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setColumnPicker(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const maxSpend = Math.max(1, ...rows.map((row) => row.spend));
  const maxSql = Math.max(1, ...rows.map((row) => row.sql));

  const columns = useMemo<ColumnDef<CalculatedPerformanceRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Tên đối tượng",
        size: 290,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="object-cell">
            <div>
              <strong>{row.original.name}</strong>
              {!row.original.isRankable ? (
                <SampleWarning messages={row.original.messages} sql={row.original.sql} />
              ) : null}
            </div>
            <span>{row.original.owner} · {row.original.brand} · {row.original.objective}</span>
          </div>
        ),
      },
      {
        id: "zone",
        accessorKey: "zone",
        header: "Vùng",
        size: 64,
        enableHiding: false,
        cell: ({ row }) => <ZoneChip zone={row.original.zone} compact />,
      },
      {
        id: "spend",
        accessorKey: "spend",
        header: "Chi tiêu",
        cell: ({ row }) => <HeatCell value={row.original.spend} max={maxSpend} kind="money" tone="blue" />,
      },
      {
        id: "messages",
        accessorKey: "messages",
        header: "Tin nhắn",
        cell: ({ row }) => <MetricCell value={row.original.messages} kind="count" />,
      },
      {
        id: "cpr",
        accessorKey: "cpr",
        header: "CPR",
        cell: ({ row }) => (
          <MetricCell
            value={row.original.cpr}
            kind="money"
            quality={row.original.cpr && row.original.cpr < 37_000 ? "good" : row.original.cpr && row.original.cpr > 41_000 ? "bad" : "neutral"}
          />
        ),
      },
      {
        id: "sql",
        accessorKey: "sql",
        header: "SQL",
        cell: ({ row }) => <HeatCell value={row.original.sql} max={maxSql} kind="count" tone="green" />,
      },
      {
        id: "captureRate",
        accessorKey: "captureRate",
        header: "Lấy số",
        cell: ({ row }) => (
          <MetricCell
            value={row.original.isRankable ? row.original.captureRate : null}
            kind="percent"
            quality={row.original.captureRate && row.original.captureRate >= 0.33 ? "good" : "bad"}
            warning={row.original.captureRate && row.original.captureRate > 1 ? "Tỷ lệ lấy số vượt 100%" : undefined}
          />
        ),
      },
      {
        id: "cpsql",
        accessorKey: "cpsql",
        header: "CPSQL",
        cell: ({ row }) => (
          <MetricCell
            value={row.original.isRankable ? row.original.cpsql : null}
            kind="money"
            quality={row.original.cpsql && row.original.cpsql < 117_000 ? "good" : "bad"}
            warning={row.original.warning}
          />
        ),
      },
      {
        id: "escapeRate",
        accessorKey: "escapeRate",
        header: "Thoát bậc 0",
        cell: ({ row }) => (
          <MetricCell
            value={row.original.isRankable ? row.original.escapeRate : null}
            kind="percent"
            quality={row.original.escapeRate && row.original.escapeRate >= 0.45 ? "good" : "bad"}
          />
        ),
      },
      {
        id: "rank2",
        accessorKey: "rank2",
        header: "Bậc 2+",
        cell: ({ row }) => <MetricCell value={row.original.isRankable ? row.original.rank2 : null} kind="count" />,
      },
      {
        id: "cpL2",
        accessorKey: "cpL2",
        header: "CP_L2",
        cell: ({ row }) => <MetricCell value={row.original.isRankable ? row.original.cpL2 : null} kind="money" />,
      },
      {
        id: "cpm",
        accessorKey: "cpm",
        header: "CPM",
        cell: ({ row }) => <MetricCell value={row.original.cpm ?? null} kind="money" />,
      },
      {
        id: "ctr",
        accessorKey: "ctr",
        header: "CTR",
        cell: ({ row }) => <MetricCell value={row.original.ctr ?? null} kind="percent" />,
      },
      {
        id: "frequency",
        accessorKey: "frequency",
        header: "Frequency",
        cell: ({ row }) => <span className="num">{row.original.frequency?.toFixed(1).replace(".", ",") ?? "—"}</span>,
      },
      {
        id: "matchRate",
        accessorKey: "matchRate",
        header: "Khớp CRM",
        cell: ({ row }) => <MetricCell value={row.original.matchRate} kind="percent" />,
      },
    ],
    [maxSpend, maxSql],
  );

  const data = useMemo(
    () =>
      rows.filter((row) => {
        if (!showSmall && !row.isRankable) return false;
        if (brand !== "Tất cả" && row.brand !== brand) return false;
        if (owner !== "Tất cả" && row.owner !== owner) return false;
        if (query && !`${row.name} ${row.owner}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [rows, showSmall, brand, owner, query],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totals = useMemo(
    () => ({
      spend: data.reduce((sum, row) => sum + row.spend, 0),
      messages: data.reduce((sum, row) => sum + row.messages, 0),
      sql: data.reduce((sum, row) => sum + row.sql, 0),
      rank2: data.reduce((sum, row) => sum + row.rank2, 0),
    }),
    [data],
  );

  const downloadCsv = () => {
    const header = ["Tên", "Vùng", "Chi tiêu", "Tin nhắn", "CPR", "SQL", "Lấy số", "CPSQL", "Thoát bậc 0"];
    const lines = data.map((row) => [
      row.name,
      zoneMeta[row.zone as Zone].label,
      row.spend,
      row.messages,
      row.cpr ?? "",
      row.sql,
      row.captureRate ?? "",
      row.cpsql ?? "",
      row.escapeRate ?? "",
    ]);
    const csv = "\uFEFF" + [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ads-insight-hieu-suat.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="performance-page">
      <div className="performance-toolbar">
        <div className="level-tabs">
          {levels.map(([id, label]) => (
            <button key={id} onClick={() => setLevel(id)} className={cn(level === id && "active")}>
              {label}
            </button>
          ))}
        </div>

        <label className="small-sample-toggle">
          <input type="checkbox" checked={showSmall} onChange={(event) => setShowSmall(event.target.checked)} />
          <span>Hiện dòng cỡ mẫu nhỏ</span>
        </label>
        <div className="toolbar-actions">
          <label className="search-box">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chiến dịch…" />
            {query ? <button onClick={() => setQuery("")}><X size={13} /></button> : null}
          </label>
          <div className="column-picker-wrap" ref={pickerRef}>
            <button className="button button-small" onClick={() => setColumnPicker((open) => !open)}>
              <Columns3 size={14} /> Chọn cột <ChevronDown size={12} />
            </button>
            {columnPicker ? (
              <div className="column-picker">
                <strong>Cột hiển thị</strong>
                {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => (
                  <label key={column.id}>
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                    <span>{typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}</span>
                    {column.getIsVisible() ? <Check size={13} /> : null}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <button className="button button-small" onClick={downloadCsv}>
            <ArrowDownToLine size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="performance-table-wrap">
        <table className="performance-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(header.column.id === "name" && "sticky-name")}
                    style={{ minWidth: header.column.id === "name" ? header.column.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                        className={cn(header.column.getCanSort() && "sortable")}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? <ArrowUpDown size={11} /> : null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => row.original.isRankable && setSelected(row.original)}
                className={cn(!row.original.isRankable && "unrankable")}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cn(cell.column.id === "name" && "sticky-name")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {table.getVisibleLeafColumns().map((column) => (
                <td key={column.id} className={cn(column.id === "name" && "sticky-name")}>
                  {column.id === "name" ? (
                    <strong>Tổng · {formatCount(data.length)} đối tượng</strong>
                  ) : column.id === "spend" ? (
                    <MetricValue value={totals.spend} kind="money" />
                  ) : column.id === "messages" ? (
                    <MetricValue value={totals.messages} kind="count" />
                  ) : column.id === "cpr" ? (
                    <MetricValue value={totals.spend / totals.messages} kind="money" />
                  ) : column.id === "sql" ? (
                    <MetricValue value={totals.sql} kind="count" />
                  ) : column.id === "captureRate" ? (
                    <MetricValue value={totals.sql / totals.messages} kind="percent" />
                  ) : column.id === "cpsql" ? (
                    <MetricValue value={totals.spend / totals.sql} kind="money" />
                  ) : column.id === "rank2" ? (
                    <MetricValue value={totals.rank2} kind="count" />
                  ) : (
                    ""
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        {!data.length ? (
          <div className="empty-state">
            <div>
              <Search size={28} />
              <p>Không tìm thấy đối tượng phù hợp bộ lọc.</p>
              <button className="button" onClick={() => setQuery("")}>Xóa tìm kiếm</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="performance-mobile-list">
        <div className="mobile-performance-head">
          <SlidersHorizontal size={15} />
          <span>{data.length} chiến dịch</span>
        </div>
        {data.map((row) => (
          <button
            key={row.id}
            className={cn("mobile-performance-card", !row.isRankable && "unrankable")}
            onClick={() => row.isRankable && setSelected(row)}
          >
            <div>
              <strong>{row.name}</strong>
              <span>{row.owner} · {row.brand}</span>
            </div>
            <ZoneChip zone={row.zone} compact />
            <div><span>CPSQL</span><MetricValue value={row.isRankable ? row.cpsql : null} kind="money" /></div>
            <div><span>SQL</span><MetricValue value={row.sql} kind="count" /></div>
          </button>
        ))}
        <div className="mobile-read-note">
          <Info size={14} />
          Dùng máy tính để xem đủ cột và xuất CSV.
        </div>
      </div>

      {selected ? <DetailDrawer row={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
