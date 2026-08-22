import { getLivePerformance } from "@/lib/infrastructure/repositories/report-repository";
import { PerformanceClient } from "./_components/performance.client";

export default async function PerformancePage({
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

  const initialRows = await getLivePerformance({ from, to, level: "campaign", brand, owner, account });

  return <PerformanceClient initialRows={initialRows || []} />;
}
