import { getLiveCrmData } from "@/lib/infrastructure/repositories/report-repository";
import { CrmClient } from "./_components/crm.client";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : null;
  const to = typeof params.to === "string" ? params.to : null;
  const brand = typeof params.brand === "string" ? params.brand : null;
  const owner = typeof params.owner === "string" ? params.owner : null;

  const live = await getLiveCrmData({ from, to, brand, owner });
  const data = live || [];

  return <CrmClient initialData={data} />;
}
