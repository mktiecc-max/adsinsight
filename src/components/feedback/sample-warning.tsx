import { Info } from "lucide-react";

export function SampleWarning({
  messages,
  sql,
}: {
  messages: number;
  sql: number;
}) {
  return (
    <span
      className="sample-warning"
      title={`Chỉ ${messages} tin nhắn / ${sql} SĐT — chưa đủ để so sánh`}
    >
      <Info size={12} />
    </span>
  );
}
