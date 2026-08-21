import { SettingsClient } from "./_components/settings.client";
import { getLiveSources } from "@/lib/infrastructure/repositories/settings-repository";

export default async function SettingsPage() {
  const sources = await getLiveSources() || [];
  return <SettingsClient initialSources={sources} />;
}
