"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileText,
  ExternalLink,
  Users
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import Link from "next/link";

interface AlumniDashboardHomeProps {
  studentName: string;
  department: string;
  cgpa: number;
  rollNo?: string;
  gradesheetUrl?: string | null;
  graduationDate?: string | null;
  enrollmentDate?: string;
}

export function AlumniDashboardHome({
  studentName,
  department,
  cgpa,
  gradesheetUrl,
  enrollmentDate,
}: AlumniDashboardHomeProps) {
  const [gradesheetModalOpen, setGradesheetModalOpen] = useState(false);

  const startYear = enrollmentDate ? new Date(enrollmentDate).getFullYear() : 2022;
  const endYear = startYear + 4;
  const batchStr = `Batch ${startYear}-${String(endYear).slice(-2)}`;

  const isPdf = gradesheetUrl?.toLowerCase().includes("pdf") || gradesheetUrl?.startsWith("data:application/pdf");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-6xl mx-auto py-4 px-4 sm:px-6"
    >
      {/* Primary Main Line Header */}
      <div className="flex flex-col gap-1 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Congratulations, {studentName}! 🎓
        </h1>
      </div>

      {/* Modern Sleek Glassmorphic Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-950/80 via-zinc-900 to-indigo-950 p-8 sm:p-10 text-white shadow-2xl">
        <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
          <GraduationCap className="h-96 w-96 text-amber-400" />
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider rounded-full backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-300 animate-pulse" />
              Official Degree Holder
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3 py-1 text-xs font-bold rounded-full backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-300" />
              All 8 Semesters Cleared
            </Badge>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Degree Completed & Awarded
            </h2>
            <p className="text-amber-200/90 text-sm sm:text-base font-medium leading-relaxed">
              Congratulations on successfully finishing your degree in <strong>{department}</strong>! Your official transcript record and clearance documents are verified and archived.
            </p>
          </div>

          {/* TWO PRIMARY ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link href="/dashboard/alumni">
              <Button className="h-12 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 hover:scale-105 transition-all gap-2.5 cursor-pointer">
                <Users className="h-5 w-5" />
                Explore Alumni Section
              </Button>
            </Link>

            {gradesheetUrl && (
              <Button
                onClick={() => setGradesheetModalOpen(true)}
                className="h-12 px-6 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold text-sm rounded-2xl backdrop-blur-md shadow-lg hover:scale-105 transition-all gap-2.5 cursor-pointer"
              >
                <FileText className="h-5 w-5 text-amber-300" />
                View Complete Degree Gradesheet
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Database Attribute Summary Grid with Batch Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border border-border bg-card p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Award className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Final CGPA</p>
              <h3 className="text-3xl font-black text-foreground mt-0.5">
                {cgpa ? cgpa.toFixed(2) : "Passed"} <span className="text-xs text-muted-foreground font-normal">/ 4.00</span>
              </h3>
            </div>
          </div>
        </Card>

        <Card className="border border-border bg-card p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20 shrink-0">
              <BookOpen className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Department</p>
              <h3 className="text-xl font-bold text-foreground truncate mt-0.5">{department}</h3>
            </div>
          </div>
        </Card>

        <Card className="border border-border bg-card p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Calendar className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Graduation Batch</p>
              <h3 className="text-xl font-black text-foreground mt-0.5">{batchStr}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Degree Gradesheet Viewer Modal */}
      <Dialog open={gradesheetModalOpen} onOpenChange={setGradesheetModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-amber-500" />
                Official Complete Degree Gradesheet
              </DialogTitle>
              <DialogDescription className="text-xs">
                Verified 8-semester academic transcript record for {studentName} ({department})
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="py-4">
            {gradesheetUrl ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between bg-muted/40 p-3 rounded-2xl border border-border text-xs font-semibold gap-2">
                  <span>Document Format: <strong>{isPdf ? "PDF Transcript Document" : "Image Gradesheet"}</strong></span>
                  <div className="flex items-center gap-3">
                    <a
                      href={gradesheetUrl}
                      download={`${studentName.replace(/\s+/g, "_")}_Degree_Gradesheet.pdf`}
                      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                    >
                      <FileText className="h-3.5 w-3.5" /> Download PDF
                    </a>
                    <a
                      href={gradesheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-primary hover:underline font-bold"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open Full Screen
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl border border-border overflow-hidden bg-black/5 dark:bg-black/40 min-h-[480px] flex items-center justify-center">
                  {isPdf ? (
                    <object
                      data={gradesheetUrl}
                      type="application/pdf"
                      className="w-full h-[580px] rounded-2xl"
                    >
                      <iframe
                        src={gradesheetUrl}
                        className="w-full h-[580px] border-none rounded-2xl"
                        title="Degree Gradesheet Document"
                      >
                        <p className="p-6 text-center text-sm text-muted-foreground">
                          Your browser does not support inline PDF viewing. Please use the download link above to view your official transcript.
                        </p>
                      </iframe>
                    </object>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={gradesheetUrl}
                      alt="Degree Gradesheet Document"
                      className="max-h-[600px] w-auto max-w-full object-contain mx-auto rounded-xl shadow-lg"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-card border border-border rounded-2xl space-y-3">
                <FileText className="h-12 w-12 mx-auto text-amber-500 opacity-50" />
                <h4 className="text-base font-bold text-foreground">Degree Gradesheet Document</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Your graduation status is verified. The complete 8-semester gradesheet document has been archived in college records.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGradesheetModalOpen(false)} className="rounded-xl">
              Close Viewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
