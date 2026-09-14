import { notFound } from "next/navigation";
import { LegacyDashboardView } from "@/components/LegacyDashboardView";

export default function AdminLegacyDashboardPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_LEGACY_DASHBOARD !== "true") {
    notFound();
  }

  return <LegacyDashboardView />;
}
