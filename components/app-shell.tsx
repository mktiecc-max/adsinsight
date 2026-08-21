"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Database,
  Menu,
  RefreshCw,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/shared/utils";

type FilterState = {
  preset: string;
  brand: string;
  owner: string;
  account: string;
  setPreset: (value: string) => void;
  setBrand: (value: string) => void;
  setOwner: (value: string) => void;
  setAccount: (value: string) => void;
};

const FilterContext = createContext<FilterState | null>(null);

export function useGlobalFilters() {
  const value = useContext(FilterContext);
  if (!value) throw new Error("useGlobalFilters must be used inside AppShell");
  return value;
}

const presets = ["7 ngày", "30 ngày", "90 ngày", "Tháng này", "Tháng trước"];

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden />
    </label>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preset, setPreset] = useState("30 ngày");
  const [brand, setBrand] = useState("Tất cả");
  const [owner, setOwner] = useState("Tất cả");
  const [account, setAccount] = useState("Tất cả");
  const [appState, setAppState] = useState<any>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setAppState(data.data))
      .catch(() => {});
  }, []);

  const context = useMemo(
    () => ({ preset, brand, owner, account, setPreset, setBrand, setOwner, setAccount }),
    [preset, brand, owner, account],
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("/").slice(0, 2).join("/"));

  const navigation = [
    { href: "/", label: "Tổng quan" },
    { href: "/performance", label: "Hiệu suất" },
    { href: "/funnel", label: "Phễu" },
    { href: "/alerts", label: "Cảnh báo", badge: appState?.alerts_count },
    { href: "/leads", label: "Lead" },
    { href: "/sync", label: "Đồng bộ", admin: true },
    { href: "/settings/ads", label: "Cài đặt", admin: true },
  ];

  return (
    <FilterContext.Provider value={context}>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-main">
            <Link href="/" className="brand-mark" aria-label="AdsInsight — Tổng quan">
              <span className="brand-logo">A</span>
              <span>AdsInsight</span>
            </Link>

            <nav className="desktop-nav" aria-label="Điều hướng chính">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("nav-link", isActive(item.href) && "active")}
                >
                  {item.label}
                  {item.badge ? <span className="nav-badge num">{item.badge}</span> : null}
                </Link>
              ))}
            </nav>

            <div className="header-actions">
              <span className="period-label">{appState?.period?.label || "Đang tải"}</span>
              <button className="icon-button notification-button" aria-label="Thông báo">
                <Bell size={17} />
                <span className="notification-dot" />
              </button>
              <button className="avatar" title={appState?.user?.name || "Tài khoản"}>
                {appState?.user?.initials || "?"}
              </button>
              <button
                className="icon-button mobile-menu-button"
                onClick={() => setMobileOpen((open) => !open)}
                aria-label="Mở điều hướng"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {mobileOpen ? (
            <nav className="mobile-nav">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn("mobile-nav-link", isActive(item.href) && "active")}
                >
                  <span>{item.label}</span>
                  {item.badge ? <span className="nav-badge num">{item.badge}</span> : null}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className="filter-bar">
            <button className="date-range-button">
              <CalendarDays size={15} />
              <span className="num">{appState?.period?.range || "Đang tải"}</span>
              <ChevronDown size={13} />
            </button>

            <div className="preset-group" aria-label="Mốc ngày nhanh">
              {presets.map((item) => (
                <button
                  key={item}
                  className={cn("preset-button", preset === item && "active")}
                  onClick={() => setPreset(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="filter-divider" />
            <div className="select-filters">
              <SelectFilter
                label="Brand"
                value={brand}
                options={["Tất cả", "ucmas", "uckid"]}
                onChange={setBrand}
              />
              <SelectFilter
                label="Người chạy"
                value={owner}
                options={["Tất cả", "haitran", "haicm", "linhpt", "ngocanh"]}
                onChange={setOwner}
              />
              <SelectFilter
                label="Tài khoản"
                value={account}
                options={["Tất cả", "UCMAS HN", "UCMAS HCM", "UCKID"]}
                onChange={setAccount}
              />
            </div>

            <div className="filter-summary num">
              {appState ? `${appState.sync.total_rows.toLocaleString()} dòng · so với ${appState.period.compare}` : "..."}
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>

        <footer className="sync-footer">
          <div className="sync-status">
            <span className="status-pulse" />
            <span>Đồng bộ lần cuối:</span>
            <strong className="num">{appState ? new Date(appState.sync.last_run).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "..."}</strong>
            <span className="footer-divider">·</span>
            <span className="num">{appState ? `${appState.sync.total_rows.toLocaleString()} dòng` : "..."}</span>
          </div>
          <Link href="/sync" className="footer-sync-link">
            <RefreshCw size={13} />
            Đồng bộ ngay
          </Link>
        </footer>

        <div className="mobile-bottom-nav">
          <Link href="/" className={cn(pathname === "/" && "active")}>
            <Database size={18} />
            <span>Tổng quan</span>
          </Link>
          <Link href="/alerts" className={cn(pathname.startsWith("/alerts") && "active")}>
            <Bell size={18} />
            <span>Cảnh báo</span>
          </Link>
          <Link href="/settings/ads" className={cn(pathname.startsWith("/settings") && "active")}>
            <Settings size={18} />
            <span>Cài đặt</span>
          </Link>
          <Link href="/login">
            <UserRound size={18} />
            <span>Tài khoản</span>
          </Link>
        </div>
      </div>
    </FilterContext.Provider>
  );
}
