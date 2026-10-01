"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/lib/axios";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Calendar, CreditCard, AlertCircle, CheckCircle2, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  audience: "All" | "Students" | "Faculty";
  priority: "Low" | "Medium" | "High";
}

interface Fee {
  id: string;
  type: string;
  amount: number;
  dueDate: string;
  status: string;
  semester: number;
}

export default function NotificationsPage() {
  const { user } = useUser();
  const userId = user?.id || "anonymous";
  const role = (user?.publicMetadata?.role as string || "student").toLowerCase();
  const isStudent = role === "student";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unpaidFees, setUnpaidFees] = useState<Fee[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loadingReadId, setLoadingReadId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch announcements and fees
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);

      const annRes = await api.get<Announcement[]>("/api/announcements");
      setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);

      if (isStudent) {
        const feesRes = await api.get<Fee[]>("/api/fees?status=Unpaid");
        setUnpaidFees(Array.isArray(feesRes.data) ? feesRes.data : []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStudent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load dismissed & read announcement IDs from localStorage
  useEffect(() => {
    if (userId) {
      const storedDismissed = localStorage.getItem(`dismissed_announcements_${userId}`);
      if (storedDismissed) {
        try {
          setDismissedIds(JSON.parse(storedDismissed));
        } catch (e) {
          console.error("Failed to parse dismissed announcements:", e);
        }
      }

      const storedRead = localStorage.getItem(`read_announcements_${userId}`);
      if (storedRead) {
        try {
          setReadIds(JSON.parse(storedRead));
        } catch (e) {
          console.error("Failed to parse read announcements:", e);
        }
      }
    }
  }, [userId]);

  // Filter out deleted/dismissed announcements
  const visibleAnnouncements = useMemo(() => {
    return announcements.filter((a) => !dismissedIds.includes(a.id));
  }, [announcements, dismissedIds]);

  // Mark single announcement as read with loading state
  const handleMarkRead = async (id: string) => {
    if (!userId || readIds.includes(id)) return;
    setLoadingReadId(id);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const updated = Array.from(new Set([...readIds, id]));
      setReadIds(updated);
      localStorage.setItem(`read_announcements_${userId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("notifications-updated"));
    } finally {
      setLoadingReadId(null);
    }
  };

  // Mark all visible announcements as read
  const handleMarkAllRead = async () => {
    if (!userId || visibleAnnouncements.length === 0) return;
    setMarkingAllRead(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const allVisibleIds = visibleAnnouncements.map((a) => a.id);
      const updated = Array.from(new Set([...readIds, ...allVisibleIds]));
      setReadIds(updated);
      localStorage.setItem(`read_announcements_${userId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("notifications-updated"));
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Delete individual notification (hides from user list)
  const handleDeleteNotification = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    if (userId) {
      localStorage.setItem(`dismissed_announcements_${userId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("notifications-updated"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse border-2 border-border" />
          <div className="h-4 w-72 bg-muted animate-pulse border-2 border-border" />
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  const hasNotifications = unpaidFees.length > 0 || visibleAnnouncements.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Notification Center"
          subtitle="Stay updated with your latest alerts and college announcements."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Notifications" },
          ]}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all cursor-pointer gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {visibleAnnouncements.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all cursor-pointer gap-2"
            >
              {markingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {!hasNotifications ? (
        <div className="rounded-xl border-2 border-border bg-card p-12 text-center shadow-[4px_4px_0px_0px_var(--border)]">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-4">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">You&apos;re all caught up!</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            There are no active announcements or pending alerts at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unpaid Student Dues Alerts (Persistent) */}
          {unpaidFees.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Urgent Action Required
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unpaidFees.map((fee) => (
                  <div
                    key={fee.id}
                    className="relative rounded-xl border-2 border-rose-500 bg-rose-500/5 p-5 shadow-[4px_4px_0px_0px_#e11d48] dark:shadow-[4px_4px_0px_0px_#f43f5e] flex gap-4 overflow-hidden"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-sm text-foreground">
                          Pending Dues: {fee.type}
                        </span>
                        <Badge variant="destructive" className="text-[10px] px-1.5 uppercase font-black tracking-wider">
                          Overdue
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        A pending payment of <strong className="text-rose-600 dark:text-rose-400">PKR {fee.amount.toLocaleString()}</strong> is due for Semester {fee.semester}. Please clear your outstanding balance as soon as possible.
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Due date: {new Date(fee.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Announcements */}
          {visibleAnnouncements.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-primary flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-primary" /> Active Announcements
              </h3>
              <div className="flex flex-col gap-4">
                <AnimatePresence initial={false}>
                  {visibleAnnouncements.map((ann) => {
                    const isRead = readIds.includes(ann.id);
                    const isMarkingThisRead = loadingReadId === ann.id;

                    return (
                      <motion.div
                        key={ann.id}
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0, border: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`relative rounded-xl border-2 border-border p-5 shadow-[4px_4px_0px_0px_var(--border)] flex gap-4 group overflow-hidden transition-all ${
                          isRead ? "bg-card/60 opacity-85" : "bg-card"
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          isRead ? "bg-accent/60 text-muted-foreground" : "bg-brand-primary/10 text-brand-primary"
                        }`}>
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-2 pr-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`font-extrabold text-sm ${isRead ? "text-muted-foreground" : "text-foreground"}`}>
                              {ann.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-black uppercase tracking-wider ${
                                ann.priority === "High"
                                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-500/20"
                                  : ann.priority === "Medium"
                                  ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-500/20"
                                  : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-500/20"
                              }`}
                            >
                              {ann.priority}
                            </Badge>
                            {isRead && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Read
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {ann.content}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground pt-1">
                            <span>By: {ann.author}</span>
                            <span>Posted: {new Date(ann.date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between shrink-0 gap-2">
                          <button
                            onClick={() => handleDeleteNotification(ann.id)}
                            className="p-1 rounded-lg border border-transparent hover:border-destructive/30 hover:bg-destructive/10 transition-all text-muted-foreground hover:text-destructive cursor-pointer focus:outline-none"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isRead || isMarkingThisRead}
                            onClick={() => handleMarkRead(ann.id)}
                            className={`h-7 text-[11px] px-2.5 rounded-lg font-semibold gap-1.5 transition-all ${
                              isRead
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 cursor-default"
                                : "text-brand-primary hover:bg-brand-primary/10 cursor-pointer"
                            }`}
                          >
                            {isMarkingThisRead ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Marking...
                              </>
                            ) : isRead ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Read
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Mark Read
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

