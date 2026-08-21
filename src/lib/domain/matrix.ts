import type { Zone } from "./types";

export function classifyMatrix(
  cpsql: number | null,
  escapeRate: number | null,
  medianCpsql: number,
  medianEscapeRate: number,
  rankable = true,
): Zone {
  if (!rankable || cpsql === null || escapeRate === null) return "unranked";
  const cheap = cpsql <= medianCpsql;
  const quality = escapeRate >= medianEscapeRate;
  if (cheap && quality) return "scale";
  if (cheap && !quality) return "trap";
  if (!cheap && quality) return "expensive";
  return "stop";
}

export const zoneMeta: Record<
  Zone,
  { label: string; action: string; className: string }
> = {
  scale: {
    label: "Nhân rộng",
    action: "Tăng ngân sách 20–30% mỗi lần",
    className: "zone-scale",
  },
  trap: {
    label: "Bẫy số rẻ",
    action: "Không tăng ngân sách, soi lại creative và tệp",
    className: "zone-trap",
  },
  expensive: {
    label: "Đúng tệp nhưng đắt",
    action: "Giữ và tối ưu chi phí",
    className: "zone-expensive",
  },
  stop: {
    label: "Dừng",
    action: "Tắt và dồn ngân sách sang nhóm tốt",
    className: "zone-stop",
  },
  unranked: {
    label: "Cỡ mẫu nhỏ",
    action: "Chờ thêm dữ liệu trước khi kết luận",
    className: "zone-unranked",
  },
};
