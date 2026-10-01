import { Bell, Menu, Calendar, Megaphone, ArrowRight, RefreshCw, X } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/axios";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}

function formatSemester(sem: number) {
  if (sem === 1) return "1st";
  if (sem === 2) return "2nd";
  if (sem === 3) return "3rd";
  return `${sem}th`;
}

import { useProgramLevel } from "@/context/program-level-context";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { programLevel, setProgramLevel } = useProgramLevel();
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [unpaidFees, setUnpaidFees] = useState<Fee[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [dbProfile, setDbProfile] = useState<{
    name: string | null;
    role: string;
    avatar?: string | null;
    faculty?: { department: string; specialization: string; avatar?: string | null } | null;
    student?: { department: string; semester: number; shift: string; status?: string; blocked?: boolean; readmitRequested?: boolean; avatar?: string | null; programLevel?: string; discipline?: string | null; part?: number | null } | null;
  } | null>(null);

  const { user } = useUser();
  const userId = user?.id || "anonymous";
  const role = (
    user?.publicMetadata?.role as string ||
    dbProfile?.role ||
    "student"
  ).toLowerCase();
  const isAdmin = role === "admin";
  const pathname = usePathname();

  useEffect(() => {
    if (userId && userId !== "anonymous") {
      api.get("/api/me")
        .then((res) => {
          setDbProfile(res.data);
        })
        .catch((err) => console.error("Failed to fetch user profile in header:", err));
    }
  }, [userId]);

  const [isRefreshingAnnouncements, setIsRefreshingAnnouncements] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const [annRes, meRes] = await Promise.all([
        api.get<Announcement[]>("/api/announcements").catch(() => ({ data: [] })),
        userId && userId !== "anonymous" ? api.get("/api/me").catch(() => null) : Promise.resolve(null),
      ]);
      const annData = Array.isArray(annRes.data) ? annRes.data : [];
      setAllAnnouncements(annData);
      if (meRes?.data) {
        setDbProfile(meRes.data);
      }

      if (role === "student") {
        const feesRes = await api.get<Fee[]>("/api/fees?status=Unpaid").catch(() => null);
        setUnpaidFees(Array.isArray(feesRes?.data) ? feesRes.data : []);
      } else {
        setUnpaidFees([]);
      }
    } catch (err) {
      console.error("Failed to fetch announcements/fees for bell:", err);
    }
  }, [role, userId]);

  const handleDismissItem = (id: string) => {
    if (!userId) return;
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem(`popup_dismissed_announcements_${userId}`, JSON.stringify(newDismissed));
      window.dispatchEvent(new Event("popup-notifications-updated"));
    } catch (e) {
      console.error("Failed to save dismissed notification:", e);
    }
  };

  // Load user-scoped dismissed announcements for popup from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);

    const syncDismissed = () => {
      if (userId) {
        const stored = localStorage.getItem(`popup_dismissed_announcements_${userId}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setTimeout(() => {
              setDismissedIds(parsed);
            }, 0);
          } catch (e) {
            console.error("Failed to parse dismissed announcements:", e);
          }
        } else {
          setTimeout(() => {
            setDismissedIds([]);
          }, 0);
        }
      }
    };

    syncDismissed();

    window.addEventListener("popup-notifications-updated", syncDismissed);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popup-notifications-updated", syncDismissed);
    };
  }, [userId, pathname]);

  const visibleAnnouncements = useMemo(() => {
    return allAnnouncements.filter((a) => !dismissedIds.includes(a.id));
  }, [allAnnouncements, dismissedIds]);

  const unreadAnnouncements = useMemo(() => {
    if (!isMounted || !userId) return [];

    let readIds: string[] = [];
    const readStored = localStorage.getItem(`read_announcements_${userId}`);
    if (readStored) {
      try {
        readIds = JSON.parse(readStored);
      } catch (e) {
        console.error("Failed to parse read announcements:", e);
      }
    }

    const lastReadStr = localStorage.getItem(`last_read_announcement_time_${userId}`);
    const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;

    return visibleAnnouncements.filter((a) => {
      if (readIds.includes(a.id)) return false;
      if (lastReadTime > 0 && new Date(a.date).getTime() <= lastReadTime) return false;
      return true;
    });
  }, [isMounted, visibleAnnouncements, userId]);

  const isStruckOff = role === "student" && dbProfile?.student?.blocked === true;
  const [showWelcomeNotice, setShowWelcomeNotice] = useState(false);

  useEffect(() => {
    if (userId && role === "student" && dbProfile?.student !== undefined) {
      const wasBlocked = localStorage.getItem(`was_blocked_${userId}`) === "true";
      const isNowBlocked = dbProfile.student?.blocked === true;

      if (wasBlocked && !isNowBlocked) {
        setTimeout(() => setShowWelcomeNotice(true), 0);
        localStorage.setItem(`welcome_notice_${userId}`, "true");
      }
      localStorage.setItem(`was_blocked_${userId}`, String(isNowBlocked));

      if (localStorage.getItem(`welcome_notice_${userId}`) === "true" && !isNowBlocked) {
        setTimeout(() => setShowWelcomeNotice(true), 0);
      }
    }
  }, [userId, role, dbProfile]);

  // Recalculate unread count based on unread announcements + unpaid dues + struck off alert + welcome notice
  const unreadCount = unreadAnnouncements.length + unpaidFees.length + (isStruckOff ? 1 : 0) + (showWelcomeNotice ? 1 : 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnnouncements();
    }, 0);

    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAnnouncements]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 sm:gap-4 border-b-2 border-border bg-card/80 backdrop-blur-md px-3 sm:px-4 lg:px-6">
        {/* Left Section: Mobile Menu + Profile Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 max-w-[60%] md:max-w-none">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden shrink-0 flex h-9 w-9 items-center justify-center rounded-none border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Student Profile Banner */}
          {role === "student" && dbProfile?.student && (
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs md:text-sm font-black border-2 border-border bg-card px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-[2px_2px_0px_0px_var(--border)] select-none truncate">
              {dbProfile.student.status === "Graduated" || dbProfile.student.status === "HSSC Completed" ? (
                <>
                  <span className="capitalize text-amber-500 font-black truncate">
                    <span className="hidden sm:inline">
                      {dbProfile.student.status === "HSSC Completed" ? "HSSC Completed Alumnus" : "Graduated Alumnus"}
                    </span>
                    <span className="sm:hidden">Alumnus</span>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="capitalize text-brand-primary truncate">
                    {dbProfile.student.discipline || dbProfile.student.department}
                  </span>
                </>
              ) : dbProfile.student.programLevel === "INTERMEDIATE" ? (
                <>
                  <span className="capitalize text-brand-primary truncate">
                    {dbProfile.student.discipline || dbProfile.student.department}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="whitespace-nowrap">Part {dbProfile.student.part || (dbProfile.student.semester >= 2 ? 2 : 1)}</span>
                </>
              ) : (
                <>
                  <span className="capitalize text-brand-primary truncate">{dbProfile.student.department.toLowerCase()}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="whitespace-nowrap">
                    <span className="hidden md:inline">Semester </span>
                    <span className="md:hidden">Sem </span>
                    {formatSemester(dbProfile.student.semester)}
                  </span>
                  <span className="hidden lg:inline text-muted-foreground">•</span>
                  <span className="hidden lg:inline capitalize text-brand-secondary">{dbProfile.student.shift}</span>
                </>
              )}
            </div>
          )}

          {/* Faculty Profile Banner */}
          {role === "faculty" && dbProfile?.faculty && (
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs md:text-sm font-black border-2 border-border bg-card px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-[2px_2px_0px_0px_var(--border)] select-none truncate">
              <span className="text-foreground font-black truncate">{dbProfile.name}</span>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <span className="hidden sm:inline capitalize text-brand-primary truncate">Dept. of {dbProfile.faculty.department.toLowerCase()}</span>
              <span className="hidden xl:inline text-muted-foreground">•</span>
              <span className="hidden xl:inline text-brand-secondary font-bold truncate">{dbProfile.faculty.specialization}</span>
            </div>
          )}

          {/* Admin Profile Banner */}
          {role === "admin" && dbProfile && (
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs md:text-sm font-black border-2 border-border bg-card px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-[2px_2px_0px_0px_var(--border)] select-none truncate">
              <span className="text-foreground font-black truncate">{dbProfile.name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-brand-primary font-black whitespace-nowrap">
                <span className="hidden sm:inline">Administrator</span>
                <span className="sm:hidden">Admin</span>
              </span>
            </div>
          )}
        </div>

        {/* Global Academic Level Toggle Switcher for Admin & Faculty (Center Flex item on Desktop/Tablet) */}
        {(role === "admin" || role === "faculty") && (
          <div className="hidden md:flex items-center justify-center shrink-0">
            <div className="inline-flex items-center p-1 rounded-2xl border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)] gap-1 sm:gap-1.5 select-none">
              <button
                type="button"
                onClick={() => setProgramLevel("BS")}
                className={`px-2.5 lg:px-3 py-1 rounded-xl text-[11px] lg:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  programLevel === "BS"
                    ? "bg-brand-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)] border border-brand-primary/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                } active:translate-y-0.5`}
              >
                <span className={`w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full ${programLevel === "BS" ? "bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40" : "bg-muted-foreground/40"}`} />
                <span className="hidden xl:inline">BS Programs</span>
                <span className="xl:hidden">BS</span>
              </button>
              <button
                type="button"
                onClick={() => setProgramLevel("INTERMEDIATE")}
                className={`px-2.5 lg:px-3 py-1 rounded-xl text-[11px] lg:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  programLevel === "INTERMEDIATE"
                    ? "bg-brand-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)] border border-brand-primary/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                } active:translate-y-0.5`}
              >
                <span className={`w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full ${programLevel === "INTERMEDIATE" ? "bg-amber-400 animate-pulse ring-2 ring-amber-400/40" : "bg-muted-foreground/40"}`} />
                <span className="hidden xl:inline">Intermediate (HSSC)</span>
                <span className="xl:hidden">Inter (HSSC)</span>
              </button>
            </div>
          </div>
        )}

        {/* Right section */}
      <div className="ml-auto flex items-center gap-3">
        {/* Notifications */}
        {!isAdmin && (
          <button
            onClick={() => setShowAnnouncementModal((prev) => !prev)}
            className="relative h-9 w-9 rounded-none border-2 border-border bg-card flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all cursor-pointer focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-none border border-border bg-system-danger text-[9px] font-black text-white shadow-[1px_1px_0px_0px_var(--border)] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {/* User button */}
        <div className="relative h-9 w-9 flex items-center justify-center">
          {(dbProfile?.avatar || dbProfile?.student?.avatar || dbProfile?.faculty?.avatar) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={dbProfile?.avatar || dbProfile?.student?.avatar || dbProfile?.faculty?.avatar || ""}
              alt={dbProfile?.name || "User Avatar"}
              className="absolute inset-0 h-9 w-9 rounded-full object-cover ring-2 ring-brand-primary/30 pointer-events-none z-10"
            />
          ) : null}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 ring-2 ring-brand-primary/20",
              },
            }}
          />
        </div>
      </div>
    </header>

    {/* Slim Mobile Sub-header Bar for Admin & Faculty (< md) */}
    {(role === "admin" || role === "faculty") && (
      <div className="md:hidden sticky top-16 z-20 flex items-center justify-center bg-card/95 backdrop-blur-md border-b border-border py-1.5 px-4 shadow-sm">
        <div className="inline-flex w-full max-w-sm items-center justify-center p-1 rounded-xl border-2 border-border bg-background shadow-[2px_2px_0px_0px_var(--border)] gap-1 select-none">
          <button
            type="button"
            onClick={() => setProgramLevel("BS")}
            className={`flex-1 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              programLevel === "BS"
                ? "bg-brand-primary text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)] border border-brand-primary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${programLevel === "BS" ? "bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40" : "bg-muted-foreground/40"}`} />
            BS Programs
          </button>
          <button
            type="button"
            onClick={() => setProgramLevel("INTERMEDIATE")}
            className={`flex-1 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              programLevel === "INTERMEDIATE"
                ? "bg-brand-primary text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)] border border-brand-primary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${programLevel === "INTERMEDIATE" ? "bg-amber-400 animate-pulse ring-2 ring-amber-400/40" : "bg-muted-foreground/40"}`} />
            Intermediate (HSSC)
          </button>
        </div>
      </div>
    )}

    {/* Centered Simple Notification Modal */}
    {isMounted && createPortal(
        <AnimatePresence>
          {showAnnouncementModal && (
            <motion.div
              key="notification-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAnnouncementModal(false)}
              className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div
                key="notification-modal-dialog"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.25 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-xl bg-card border-2 border-border p-6 rounded-3xl shadow-2xl space-y-5 max-h-[85vh] flex flex-col overflow-hidden my-auto mx-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">New Notifications</h3>
                      <p className="text-xs text-muted-foreground">Unread alerts & campus announcements</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsRefreshingAnnouncements(true);
                      await fetchAnnouncements();
                      setIsRefreshingAnnouncements(false);
                    }}
                    disabled={isRefreshingAnnouncements}
                    className="rounded-xl h-8 text-xs gap-1.5 border-border"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingAnnouncements ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {unreadCount === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Bell className="h-10 w-10 mx-auto mb-2 opacity-40 text-brand-primary" />
                      <p className="text-sm font-bold text-foreground">No new notifications</p>
                      <p className="text-xs text-muted-foreground mt-1">You are all caught up! Check the Notification Center for past history.</p>
                    </div>
                  ) : (
                    <>
                      {isStruckOff && (
                        <div className="p-4 rounded-2xl bg-rose-600/15 border-2 border-rose-600 text-rose-600 dark:text-rose-400 space-y-2 animate-pulse">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="destructive" className="uppercase text-[9px] font-black bg-rose-600 text-white">
                              URGENT ALERT
                            </Badge>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Status: Struck Off</span>
                          </div>
                          <p className="text-xs font-bold leading-snug">
                            You have been Struck Off due to attendance shortage. Please contact your instructor or administration for Re-Admission approval.
                          </p>
                        </div>
                      )}

                      {showWelcomeNotice && (
                        <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge className="bg-emerald-600 text-white uppercase text-[9px] font-black">
                              ACCOUNT REACTIVATED
                            </Badge>
                            <button
                              onClick={() => {
                                if (userId) {
                                  localStorage.removeItem(`welcome_notice_${userId}`);
                                }
                                setShowWelcomeNotice(false);
                              }}
                              className="text-xs font-bold underline hover:opacity-80 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                          <p className="text-xs font-bold leading-snug">
                            Welcome Back! 🎉 Your account has been reactivated and re-admission has been approved by the Administration.
                          </p>
                        </div>
                      )}
                      {unpaidFees.map((fee) => (
                        <div
                          key={fee.id}
                          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="destructive" className="uppercase text-[9px] font-black">Unpaid Dues</Badge>
                            <span className="text-[11px] text-muted-foreground font-mono">Due: {new Date(fee.dueDate).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-foreground font-semibold">
                            Pending Fee Payment: {fee.type} (PKR {fee.amount.toLocaleString()})
                          </p>
                        </div>
                      ))}

                      {unreadAnnouncements.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-4 rounded-2xl bg-accent/30 border border-border space-y-2 hover:bg-accent/50 transition-colors relative group"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={
                                  ann.priority === "High"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                    : "bg-brand-primary/10 text-brand-primary border-brand-primary/30"
                                }
                              >
                                {ann.priority} Priority
                              </Badge>
                              <span className="text-xs font-semibold text-foreground">{ann.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                <Calendar className="h-3 w-3" />
                                {new Date(ann.date).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleDismissItem(ann.id)}
                                className="h-6 w-6 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                                title="Dismiss notification"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {ann.content}
                          </p>
                          <div className="pt-1 text-[11px] text-muted-foreground/80 font-medium">
                            Posted by: {ann.author || "College Administration"}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setShowAnnouncementModal(false)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary/90 transition-colors shadow-sm"
                  >
                    Go to Notification Center <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => setShowAnnouncementModal(false)} className="rounded-xl">
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

