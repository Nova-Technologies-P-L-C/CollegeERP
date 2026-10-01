"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/axios";
import { Star, MessageSquare, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { StatsCardSkeleton, ChartSkeleton, ListSkeleton } from "@/components/ui";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";

import { useUser } from "@clerk/nextjs";
import { useProgramLevel } from "@/context/program-level-context";

interface FeedbackItem {
  id: string;
  type: "Faculty" | "Course";
  targetId: string;
  rating: number;
  comment: string;
  date: string;
}

const STAR_COLORS = [
  "var(--color-system-danger)",
  "var(--color-data-4)",
  "var(--color-system-warning)",
  "var(--color-data-7)",
  "var(--color-system-success)",
];

export default function FacultyFeedbackPage() {
  const { user } = useUser();
  const { programLevel } = useProgramLevel();
  const role = (user?.publicMetadata?.role as string || "").toLowerCase();
  const isAdmin = role === "admin";

  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<FeedbackItem[]>(`/api/feedback?programLevel=${programLevel}`);
      setFeedback(r.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [programLevel]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleRefresh = () => {
    fetchFeedback();
  };

  const avgRating =
    feedback.length > 0
      ? +(
          feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        ).toFixed(1)
      : 0;

  const totalReviews = feedback.length;
  const fiveStarCount = feedback.filter((f) => f.rating === 5).length;

  // Distribution chart
  const distributionData = [1, 2, 3, 4, 5].map((star) => ({
    star: `${star} ★`,
    count: feedback.filter((f) => f.rating === star).length,
    fill: STAR_COLORS[star - 1],
  }));

  const distributionConfig: ChartConfig = Object.fromEntries(
    [1, 2, 3, 4, 5].map((s) => [
      `${s} ★`,
      { label: `${s} Star`, color: STAR_COLORS[s - 1] },
    ]),
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse border-2 border-border" />
          <div className="h-4 w-64 bg-muted animate-pulse border-2 border-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        <ChartSkeleton />
        <ListSkeleton count={4} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title={isAdmin ? "Overall Feedback" : "My Feedback"}
        subtitle={isAdmin ? "Student feedback and ratings across all campus courses and faculty" : "Student feedback and ratings for your courses"}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Feedback" },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Average Rating"
          value={`${avgRating}/5`}
          trend={avgRating >= 4 ? "Excellent" : "Good"}
          trendDirection="up"
          icon={Star}
          iconColor="var(--color-data-4)"
          iconBg="color-mix(in oklab, var(--color-data-4) 10%, transparent)"
        />
        <StatsCard
          title="Total Reviews"
          value={totalReviews}
          trend="All time"
          trendDirection="up"
          icon={MessageSquare}
          iconColor="var(--color-brand-primary)"
          iconBg="rgb(var(--color-brand-primary-rgb) / 0.1)"
        />
        <StatsCard
          title="5-Star Reviews"
          value={fiveStarCount}
          trend={`${totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 0}%`}
          trendDirection="up"
          icon={TrendingUp}
          iconColor="var(--color-system-success)"
          iconBg="rgb(var(--color-system-success-rgb) / 0.1)"
        />
      </div>

      {/* Rating Distribution Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Rating Distribution
        </h3>
        <ChartContainer
          config={distributionConfig}
          className="min-h-[180px] max-h-[220px] w-full"
        >
          <BarChart accessibilityLayer data={distributionData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="star" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={24}>
              {distributionData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      {/* Big Rating Card */}
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="flex items-center justify-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-8 w-8 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
            />
          ))}
        </div>
        <p className="text-4xl font-bold text-foreground">{avgRating}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Based on {totalReviews} reviews
        </p>
      </div>

      {/* Feedback List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Recent Feedback
        </h3>
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No feedback received yet.
            </p>
          ) : (
            feedback.map((f) => {
              return (
                <div
                  key={f.id}
                  className="flex items-start gap-4 rounded-lg p-4 bg-accent/20 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                    ?
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        Anonymous
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${s <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {f.comment}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(f.date).toLocaleDateString()} •{" "}
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {f.type}
                      </Badge>
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
