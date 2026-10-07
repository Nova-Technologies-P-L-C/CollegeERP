"use client";

import { useAuditLog, type AuditLogEntry } from "@/hooks/useAuditLog";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Plus, Trash2, Clock } from "lucide-react";

interface AuditBadgeProps {
  entity: string;
  entityId: string;
}

function getIcon(action: string) {
  switch (action) {
    case "CREATED":
      return <Plus className="w-3 h-3 text-emerald-400" />;
    case "DELETED":
      return <Trash2 className="w-3 h-3 text-red-400" />;
    default:
      return <Pencil className="w-3 h-3 text-blue-400" />;
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: then.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * AuditBadge — shows the most recent admin action on an entity.
 *
 * Displayed as a subtle annotation:
 *   ✏️ Updated by Ali Abbas — 2h ago
 */
export function AuditBadge({ entity, entityId }: AuditBadgeProps) {
  const logs = useAuditLog(entity, entityId);
  const latest: AuditLogEntry | undefined = logs[0];

  if (!latest) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground"
      >
        {getIcon(latest.action)}
        <span className="truncate max-w-[260px]">
          {latest.description}
        </span>
        <span className="flex items-center gap-0.5 shrink-0 opacity-70">
          <Clock className="w-2.5 h-2.5" />
          {formatRelativeTime(latest.createdAt)}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * AuditBadgeInline — compact version for table rows.
 * Shows "by AdminName — time" inline.
 */
export function AuditBadgeInline({ entity, entityId }: AuditBadgeProps) {
  const logs = useAuditLog(entity, entityId);
  const latest: AuditLogEntry | undefined = logs[0];

  if (!latest) return null;

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 ml-2"
    >
      {getIcon(latest.action)}
      <span>by {latest.adminName}</span>
      <span>· {formatRelativeTime(latest.createdAt)}</span>
    </motion.span>
  );
}
