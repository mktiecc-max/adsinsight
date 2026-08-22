import { RefreshCw } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", opacity: 0.5 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <RefreshCw className="spinner" size={32} />
        <p>Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}
