"use client";

import { motion } from "framer-motion";
import {
  User,
  GraduationCap,
  Building2,
  Calendar,
  Clock,
  MapPin,
  BadgeCheck,
  Shield,
  Briefcase,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CurrentLecture {
  courseName: string;
  courseCode: string;
  room: string;
  startTime: string;
  endTime: string;
}

interface CourseInfo {
  courseCode: string;
  courseName: string;
  creditHours: number;
  semester?: number;
  shift?: string;
}

export interface ProfileData {
  name: string;
  role: "STUDENT" | "FACULTY" | "ADMIN";
  institution: string;
  email?: string;
  avatarUrl?: string | null;
  currentLecture: CurrentLecture | null;
  // Student fields
  rollNo?: string;
  phone?: string | null;
  department?: string;
  semester?: number;
  shift?: string;
  enrollmentDate?: string;
  cgpa?: number;
  blocked?: boolean;
  approvedBy?: string | null;
  attendanceRate?: number | null;
  totalAttendanceRecords?: number;
  duesStatus?: "Outstanding" | "Clear";
  outstandingFees?: number;
  enrolledCourses?: CourseInfo[];
  // Faculty fields
  specialization?: string;
  joinDate?: string;
  assignedCourses?: CourseInfo[];
  todayAttendance?: {
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
  } | null;
  todayClasses?: {
    courseName: string;
    department: string;
    semester: number;
    room: string;
    startTime: string;
    endTime: string;
  }[];
  todayAssignedClasses?: number;
  todayAttendedClasses?: number;
  // Admin fields
  designation?: string;
}

const roleConfig = {
  STUDENT: {
    label: "Student",
    icon: GraduationCap,
    gradient: "from-brand-primary to-brand-secondary",
    statusLabel: "Active Student",
    statusColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    blockedLabel: "Account Suspended",
    blockedColor: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  FACULTY: {
    label: "Faculty Instructor",
    icon: Briefcase,
    gradient: "from-indigo-700 via-indigo-800 to-blue-700",
    statusLabel: "Faculty Instructor",
    statusColor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    blockedLabel: "",
    blockedColor: "",
  },
  ADMIN: {
    label: "Administrator",
    icon: Shield,
    gradient: "from-system-danger to-[#F59E0B]",
    statusLabel: "System Administrator",
    statusColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    blockedLabel: "",
    blockedColor: "",
  },
};

/* ── Info Row ─────────────────────────────────── */
function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-2.5 text-xs text-white/90"
    >
      <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">{label}</p>
        <p className={`font-semibold truncate text-white ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Main Component ───────────────────────────── */
export function PublicProfileCard({ profile }: { profile: ProfileData }) {
  const config = roleConfig[profile.role];
  const RoleIcon = config.icon;

  const isBlocked = profile.role === "STUDENT" && profile.blocked;
  const attendanceRate = profile.attendanceRate ?? 0;
  const totalRecords = profile.totalAttendanceRecords ?? 0;
  const isEligible = totalRecords === 0 ? true : attendanceRate >= 75;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-3xl"
    >
      <div className="bg-card rounded-3xl shadow-xl overflow-hidden border border-border grid grid-cols-1 md:grid-cols-12">
        {/* ═══ Left Column: Columnar Picture + Profile & Academic Details ═══ */}
        <div
          className={`md:col-span-5 bg-gradient-to-br ${config.gradient} p-6 text-center relative flex flex-col justify-between items-center text-white space-y-4`}
        >
          {/* Top badges */}
          <div className="w-full flex items-center justify-between gap-2">
            <div
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border backdrop-blur-sm ${isBlocked
                  ? "bg-red-500/20 text-red-100 border-red-400/30"
                  : "bg-white/20 text-white border-white/20"
                }`}
            >
              {isBlocked ? (
                <>
                  <XCircle className="w-3 h-3" />
                  Suspended
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  {config.statusLabel}
                </>
              )}
            </div>

            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] text-white font-semibold">
              <BadgeCheck className="w-3.5 h-3.5" />
              Verified
            </div>
          </div>

          {/* Picture + Name Columnar Section */}
          <div className="flex flex-col items-center text-center w-full py-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 180 }}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-3 border-2 border-white/30 overflow-hidden ring-4 ring-white/10 shadow-lg shrink-0"
            >
              {profile.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="object-cover h-full w-full"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </motion.div>

            <h1 className="text-xl font-black text-white mb-0.5 leading-snug">
              {profile.name}
            </h1>

            {profile.rollNo && (
              <p className="text-xs text-white/80 font-mono font-semibold mb-2">
                {profile.rollNo}
              </p>
            )}

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-0.5 text-[11px] text-white font-bold">
                <RoleIcon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
          </div>

          {/* Academic & Profile Details Columnar Stack */}
          <div className="w-full space-y-2.5 pt-3 border-t border-white/20 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              Academic &amp; Profile Details
            </p>

            <InfoRow icon={Building2} label="Institution" value={profile.institution} delay={0.35} />

            {profile.department && (
              <InfoRow icon={GraduationCap} label="Department" value={profile.department} delay={0.4} />
            )}

            {profile.semester !== undefined && (
              <InfoRow
                icon={Calendar}
                label="Semester & Shift"
                value={`Sem ${profile.semester} (${profile.shift ?? "Morning"})`}
                delay={0.45}
              />
            )}

            {profile.specialization && (
              <InfoRow icon={Briefcase} label="Specialization" value={profile.specialization} delay={0.45} />
            )}

            {profile.enrollmentDate && (
              <InfoRow
                icon={Calendar}
                label="Enrolled Since"
                value={new Date(profile.enrollmentDate).toLocaleDateString("en-PK", {
                  year: "numeric",
                  month: "short",
                })}
                delay={0.5}
              />
            )}

            {profile.joinDate && (
              <InfoRow
                icon={Calendar}
                label="Joined Date"
                value={new Date(profile.joinDate).toLocaleDateString("en-PK", {
                  year: "numeric",
                  month: "short",
                })}
                delay={0.5}
              />
            )}

            {profile.role !== "STUDENT" && profile.email && <InfoRow icon={Mail} label="Email" value={profile.email} mono delay={0.55} />}
            {profile.role !== "STUDENT" && profile.phone && <InfoRow icon={Phone} label="Phone" value={profile.phone} delay={0.6} />}
          </div>
        </div>

        {/* ═══ Right Column: Dynamic Real-Time Details (Attendance, Classes, Live Schedule) ═══ */}
        <div className="md:col-span-7 flex flex-col justify-between bg-card p-6 space-y-5">
          <div className="space-y-4">
            {profile.role !== "FACULTY" && (
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dynamic Real-Time Status &amp; Metrics
              </h3>
            )}

            {/* Student Dynamic Features: Attendance & Exam Eligibility */}
            {profile.role === "STUDENT" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Attendance Rate &amp; Eligibility
                  </span>
                  {isBlocked ? (
                    <Badge variant="destructive" className="bg-rose-600 text-white font-bold text-xs py-1 px-3">
                      ⛔ Struck Off — Ineligible for Exams
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={
                        isEligible
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs font-bold"
                      }
                    >
                      {isEligible ? "✓ Eligible for Exams" : "⚠ Shortage Alert (<75%)"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-3xl font-extrabold text-brand-primary font-mono">{attendanceRate}%</p>
                    <p className="text-[11px] text-muted-foreground">Minimum 75% required for examination eligibility</p>
                  </div>
                  <div className="w-24 bg-muted h-3 rounded-full overflow-hidden shrink-0 border border-border">
                    <div
                      className={`h-full transition-all duration-500 ${isBlocked || !isEligible ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                </div>

                {profile.duesStatus && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                    <span className="text-muted-foreground font-medium">Financial Dues Status:</span>
                    <span
                      className={`font-bold ${profile.duesStatus === "Clear" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                    >
                      {profile.duesStatus === "Clear" ? "✓ All Dues Clear" : "⚠ Fees Outstanding"}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Faculty Dynamic Features: Present Today & Bulleted Class Schedule */}
            {profile.role === "FACULTY" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-4"
              >
                {/* Present Today Status Row */}
                {(() => {
                  const hasCheckedIn = Boolean(profile.todayAttendance && profile.todayAttendance.checkInTime);
                  const statusText = hasCheckedIn
                    ? profile.todayAttendance?.status ?? "Present"
                    : profile.todayAttendance?.status === "Absent"
                    ? "Absent"
                    : "Pending Check-In";

                  const badgeClass =
                    statusText === "Present"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : statusText === "Late"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : statusText === "Absent"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse";

                  return (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border">
                      <div>
                        <span className="text-xs font-bold text-foreground block">Faculty Status</span>
                        {hasCheckedIn && profile.todayAttendance?.checkInTime && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Checked in: {new Date(profile.todayAttendance.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold ${badgeClass}`}
                      >
                        {statusText}
                      </Badge>
                    </div>
                  );
                })()}

                {/* Today's Classes Schedule Cards */}
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Today&apos;s Class Schedule ({profile.todayClasses?.length ?? 0})
                  </p>
                  {(!profile.todayClasses || profile.todayClasses.length === 0) ? (
                    <p className="text-xs text-muted-foreground italic">No classes scheduled for today.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {profile.todayClasses.map((c, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-muted/40 border border-border space-y-1.5 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-sm text-foreground truncate">{c.courseName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            {c.department} • Semester {c.semester}
                          </p>
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                              {c.startTime} - {c.endTime}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
                              Room: {c.room}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Live Timetable Current Lecture Panel */}
            {profile.currentLecture ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="p-4 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-2xl border border-brand-primary/30"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-bold text-brand-primary dark:text-brand-light uppercase tracking-wider">
                    Current Lecture
                  </span>
                </div>
                <p className="font-bold text-base text-foreground">
                  {profile.currentLecture.courseName}
                </p>
                <p className="text-xs text-muted-foreground mb-3 font-mono">
                  {profile.currentLecture.courseCode}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                    Room: {profile.currentLecture.room}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-foreground font-mono">
                    <Clock className="w-3.5 h-3.5 text-brand-primary" />
                    {profile.currentLecture.startTime} – {profile.currentLecture.endTime}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="p-4 bg-muted/30 rounded-2xl border border-border flex items-center gap-3 text-xs text-muted-foreground font-medium"
              >
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>No active class scheduled at this current time.</span>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-border text-center text-xs text-muted-foreground">
            <p className="font-semibold">Nova Technology ERP Portal</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
              Official Verified Record
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
