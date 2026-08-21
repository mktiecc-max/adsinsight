import { getLiveLeads } from "@/lib/data/report-repository";
import { LeadsClient } from "./_components/leads.client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : null;
  const to = typeof params.to === "string" ? params.to : null;

  const live = await getLiveLeads({ from, to });
  const data = live || [];

  return <LeadsClient initialLeads={data} />;
}
