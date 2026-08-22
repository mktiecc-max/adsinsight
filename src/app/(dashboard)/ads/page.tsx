import { getLiveAdsData } from "@/lib/infrastructure/repositories/report-repository";
import { AdsClient } from "./_components/ads.client";

export default async function AdsPage({
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

  const live = await getLiveAdsData({ from, to, brand, owner, account });
  const data = live || [];

  return <AdsClient initialData={data} />;
}
