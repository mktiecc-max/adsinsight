import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AdsInsight",
    template: "%s · AdsInsight",
  },
  description: "Báo cáo và phân tích hiệu suất Facebook Ads",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
