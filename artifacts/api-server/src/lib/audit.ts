import { db } from "@workspace/db";
import { auditLogTable } from "@workspace/db/schema";
import type { SessionPayload } from "./auth";

export type AuditAction = "create" | "update" | "delete";

export async function logAudit(
  session: SessionPayload | undefined,
  action: AuditAction,
  entity: string,
  entityId: string | number | null,
  details?: string,
): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      employeeId: session?.employeeId ?? null,
      employeeName: session?.name || "النظام",
      action,
      entity,
      entityId: entityId != null ? String(entityId) : null,
      details: details ?? null,
    });
  } catch {
    // Audit logging is best-effort — never crash the main request
  }
}
