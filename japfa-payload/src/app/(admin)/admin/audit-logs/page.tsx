import { getPayload } from "payload";
import config from "@payload-config";
import {
  AdminAuditLogsClient,
  type AdminAuditLogRow,
} from "@/components/admin/AdminAuditLogsClient";
import { getAppUser } from "@/server/auth";

export default async function AdminAuditLogsPage() {
  const user = await getAppUser();
  const payload = await getPayload({ config });
  const logs = await payload.find({
    collection: "audit-logs",
    limit: 30,
    sort: "-timestamp",
    depth: 0,
    overrideAccess: false,
    user: user!,
  });
  const rows: AdminAuditLogRow[] = logs.docs.map((item) => ({
    id: item.id,
    action: String(item.action || ""),
    actorEmail: String(item.actorEmail || ""),
    actorRole: String(item.actorRole || ""),
    targetCollection: String(item.targetCollection || ""),
    targetId: String(item.targetId || ""),
    ip: String(item.ip || ""),
    timestamp: String(
      item.timestamp || item.createdAt || new Date().toISOString(),
    ),
  }));

  return (
    <AdminAuditLogsClient
      initialLogs={rows}
      initialTotalDocs={logs.totalDocs}
    />
  );
}
