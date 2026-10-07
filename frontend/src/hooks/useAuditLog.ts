"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/axios";

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  adminId: string;
  adminName: string;
  createdAt: string;
}

/**
 * Fetches the most recent audit log entries for a given entity and (optionally) entityId.
 * Returns an empty array on error or if user is not admin.
 */
export function useAuditLog(
  entity: string,
  entityId?: string,
): AuditLogEntry[] {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ entity });
      if (entityId) params.set("entityId", entityId);

      const res = await api.get<AuditLogEntry[]>(
        `/api/audit-log?${params.toString()}`,
      );
      if (res.status === 200) {
        setLogs(res.data);
      }
    } catch {
      // Silently fail — audit is informational, not critical
    }
  }, [entity, entityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

  return logs;
}
