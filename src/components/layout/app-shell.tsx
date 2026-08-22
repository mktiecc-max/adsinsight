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
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/shared/utils";
import { getPresetRange, formatDateVN } from "@/lib/shared/date-utils";
import { useRouter, useSearchParams } from "next/navigation";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preset, setPreset] = useState("30 ngày");
  const [brand, setBrand] = useState("Tất cả");
  const [owner, setOwner] = useState("Tất cả");
  const [account, setAccount] = useState("Tất cả");
  const [appState, setAppState] = useState<any>(null);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      setCustomFrom(from);
      setCustomTo(to);
      // Try to match a preset
      let matchedPreset = "";
      for (const p of presets) {
        const range = getPresetRange(p);
        if (range.from === from && range.to === to) {
          matchedPreset = p;
          break;
        }
      }
      setPreset(matchedPreset || "Tuỳ chỉnh");
    } else {
      // Default behavior
      const defaultRange = getPresetRange("30 ngày");
      if (pathname !== "/sync") {
        router.replace(`?from=${defaultRange.from}&to=${defaultRange.to}`);
      }
      setPreset("30 ngày");
    }
  }, [searchParams, pathname, router]);

  const handleApplyPreset = (p: string) => {
    setPreset(p);
    const range = getPresetRange(p);
    if (range.from && range.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", range.from);
      params.set("to", range.to);
      router.push(`?${params.toString()}`);
    }
  };

  const handleApplyCustomDate = () => {
    if (customFrom && customTo) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", customFrom);
      params.set("to", customTo);
      router.push(`?${params.toString()}`);
      setShowDatePicker(false);
    }
  };

  const displayRange = useMemo(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) return `${formatDateVN(from)} - ${formatDateVN(to)}`;
    return "Đang tải";
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setAppState(data.data))
      .catch(() => {});
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "Tất cả") params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  const context = useMemo(
    () => ({ 
      preset, 
      brand: searchParams.get("brand") || "Tất cả", 
      owner: searchParams.get("owner") || "Tất cả", 
      account: searchParams.get("account") || "Tất cả", 
      setPreset, 
      setBrand: (v: string) => handleFilterChange("brand", v), 
      setOwner: (v: string) => handleFilterChange("owner", v), 
      setAccount: (v: string) => handleFilterChange("account", v) 
    }),
    [preset, searchParams],
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("/").slice(0, 2).join("/"));

  const navigation = [
    { href: "/", label: "Tổng quan" },
    { href: "/performance", label: "Hiệu suất" },
    { href: "/funnel", label: "Phễu" },
    { href: "/alerts", label: "Cảnh báo", badge: appState?.alerts_count },
    { href: "/leads", label: "Lead" },
    { href: "/ads", label: "Quảng cáo" },
    { href: "/crm", label: "CRM" },
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
            <div className="relative" ref={datePickerRef}>
              <button 
                className="date-range-button" 
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <CalendarDays size={15} />
                <span className="num">{displayRange}</span>
                <ChevronDown size={13} />
              </button>
              
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 p-4 bg-white border shadow-lg rounded-lg z-50 flex flex-col gap-3 min-w-[280px]">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Từ ngày</label>
                    <input 
                      type="date" 
                      className="border rounded p-2 text-sm"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Đến ngày</label>
                    <input 
                      type="date" 
                      className="border rounded p-2 text-sm"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                    />
                  </div>
                  <button 
                    className="mt-2 bg-blue-600 text-white rounded p-2 text-sm font-semibold hover:bg-blue-700"
                    onClick={handleApplyCustomDate}
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </div>

            <div className="preset-group" aria-label="Mốc ngày nhanh">
              {presets.map((item) => (
                <button
                  key={item}
                  className={cn("preset-button", preset === item && "active")}
                  onClick={() => handleApplyPreset(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="filter-divider" />
            <div className="select-filters">
              <SelectFilter
                label="Brand"
                value={searchParams.get("brand") || "Tất cả"}
                options={["Tất cả", "ucmas", "uckid"]}
                onChange={(v) => handleFilterChange("brand", v)}
              />
              <SelectFilter
                label="Người chạy"
                value={searchParams.get("owner") || "Tất cả"}
                options={["Tất cả", "haitran", "haicm", "linhpt", "ngocanh"]}
                onChange={(v) => handleFilterChange("owner", v)}
              />
              <SelectFilter
                label="Tài khoản"
                value={searchParams.get("account") || "Tất cả"}
                options={["Tất cả", "UCMAS HN", "UCMAS HCM", "UCKID"]}
                onChange={(v) => handleFilterChange("account", v)}
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
