"use client";

import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  trend: string;
  trendDirection: "up" | "down";
  trendLabel?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export function StatsCard({
  title,
  value,
  trend,
  trendDirection,
  trendLabel,
  icon: Icon,
  iconColor,
  iconBg,
}: StatsCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-none border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px_var(--border)] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--border)] select-none">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-black tracking-tight text-foreground">{value}</p>
          <div className="flex items-center gap-1.5">
            {trendDirection === "up" ? (
              <TrendingUp className="h-3.5 w-3.5 text-system-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-system-danger" />
            )}
            <span
              className={cn(
                "text-xs font-bold",
                trendDirection === "up" ? "text-system-success" : "text-system-danger"
              )}
            >
              {trend}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {trendLabel || "vs last month"}
            </span>
          </div>
        </div>

        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] transition-transform group-hover:scale-105"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-6 w-6" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}
