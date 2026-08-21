export function getPresetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  
  if (preset === "Hôm nay") {
    const d = `${yyyy}-${mm}-${dd}`;
    return { from: d, to: d };
  }
  
  if (preset === "7 ngày") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { from, to: `${yyyy}-${mm}-${dd}` };
  }
  
  if (preset === "30 ngày") {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { from, to: `${yyyy}-${mm}-${dd}` };
  }
  
  if (preset === "90 ngày") {
    const d = new Date();
    d.setDate(d.getDate() - 89);
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { from, to: `${yyyy}-${mm}-${dd}` };
  }
  
  if (preset === "Tháng này") {
    const from = `${yyyy}-${mm}-01`;
    const to = `${yyyy}-${mm}-${new Date(yyyy, today.getMonth() + 1, 0).getDate()}`;
    return { from, to };
  }
  
  if (preset === "Tháng trước") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const from = `${y}-${m}-01`;
    const to = `${y}-${m}-${new Date(y, d.getMonth() + 1, 0).getDate()}`;
    return { from, to };
  }
  
  return { from: "", to: "" };
}

export function formatDateVN(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
