"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@/context/SanctumAuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { api } from "@/lib/axios";
import { DEPARTMENTS, INTERMEDIATE_DISCIPLINES } from "@/lib/constants";
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  BookOpen,
  ShieldOff,
  GraduationCap,
  BookMarked,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface Admission {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  programLevel?: "BS" | "INTERMEDIATE";
  appliedDepartment?: string | null;
  discipline?: string | null;
  fatherName: string;
  cnic: string;
  previousInstitution: string;
  marksObtained: number;
  totalMarks: number;
  shift?: string;
  semester?: number | null;
  part?: number | null;
  selectedCourses: string[];
  status: string;
}

const formatPhoneNumber = (val: string) => {
  // Allow + at start, digits, spaces, hyphens — strip everything else
  let clean = val.replace(/[^\d+\s\-]/g, "");
  // Ensure + only appears at the start
  if (clean.indexOf("+") > 0) {
    clean = clean.replace(/\+/g, "");
  }
  return clean;
};

const formatCNIC = (val: string) => {
  // Fayda ID: exactly 12 numeric digits
  return val.replace(/\D/g, "").substring(0, 12);
};

/**
 * Validates an Ethiopian Fayda ID number.
 * Rules (based on NIDP/MOSIP format):
 *  - Exactly 12 digits
 *  - Numeric only
 *  - Must not start with 0
 *  - Must not be all the same digit (e.g. 111111111111)
 *  - Must not be a simple sequential run (e.g. 123456789012)
 */
const validateFaydaId = (id: string): string | null => {
  const clean = id.replace(/\D/g, "");
  if (clean.length !== 12) return "Fayda ID must be exactly 12 digits.";
  if (clean[0] === "0") return "Fayda ID cannot start with 0.";
  if (/^(\d)\1{11}$/.test(clean)) return "Fayda ID cannot be all the same digit.";
  // Check for simple ascending/descending sequences
  const ascending  = "0123456789012345";
  const descending = "9876543210987654";
  for (let i = 0; i <= ascending.length - 12; i++) {
    if (clean === ascending.substring(i, i + 12) ||
        clean === descending.substring(i, i + 12)) {
      return "Fayda ID appears to be a sequential number. Please enter your real ID.";
    }
  }
  return null; // valid
};

export default function StudentSetupPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Status and overall loading states
  const [statusLoading, setStatusLoading] = useState(true);
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Form step
  const [step, setStep] = useState(1);

  // Form states
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [cnic, setCnic] = useState("");
  const [programLevel, setProgramLevel] = useState<"BS" | "INTERMEDIATE">("BS");
  const [appliedDepartment, setAppliedDepartment] = useState("Computer Science");
  const [discipline, setDiscipline] = useState("ICS");
  const [shift, setShift] = useState("Morning");
  const [semester, setSemester] = useState("1");
  const [part, setPart] = useState("1");
  const [previousInstitution, setPreviousInstitution] = useState("");
  const [marksObtained, setMarksObtained] = useState("");
  const [totalMarks, setTotalMarks] = useState("");

  // Submission state
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Check setup/admission status
  const checkStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get("/api/admissions/my-status");
      const statusData = res.data;

      if (statusData.hasProfile) {
        // Already verified and setup. Go to dashboard!
        router.push("/dashboard");
        return;
      }

      setAdmission(statusData.admission || null);
      setBlocked(!!statusData.blocked);
      setRejectedCount(statusData.rejectedCount ?? 0);
    } catch (err) {
      console.error("Error checking student status:", err);
    } finally {
      setStatusLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  // Check status on mount
  useEffect(() => {
    if (!isLoaded || !user) return;
    checkStatus();
  }, [isLoaded, user, checkStatus]);

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg("");

    // Validation checks
    if (
      !phone.trim() ||
      !fatherName.trim() ||
      !cnic.trim() ||
      (programLevel === "BS" && !appliedDepartment) ||
      (programLevel === "INTERMEDIATE" && !discipline) ||
      !previousInstitution.trim() ||
      !marksObtained ||
      !totalMarks
    ) {
      setErrorMsg("Please fill in all details.");
      return;
    }

    if (phone.length < 7) {
      setErrorMsg("Please enter a valid phone number (e.g. +251 912 345678).");
      return;
    }

    const faydaError = validateFaydaId(cnic);
    if (faydaError) {
      setErrorMsg(faydaError);
      return;
    }

    const marks = Number(marksObtained);
    const total = Number(totalMarks);

    if (isNaN(marks) || isNaN(total) || marks < 0 || total <= 0) {
      setErrorMsg("Marks must be valid numbers.");
      return;
    }

    if (marks > total) {
      setErrorMsg("Marks obtained cannot exceed total marks.");
      return;
    }

    setSubmitLoading(true);
    try {
      const payload: Record<string, unknown> = {
        studentName: user.fullName || `${user.firstName} ${user.lastName}`,
        email: user.primaryEmailAddress?.emailAddress,
        phone,
        fatherName,
        cnic,
        programLevel,
        previousInstitution,
        marksObtained: marks,
        totalMarks: total,
        selectedCourses: [],
      };

      if (programLevel === "BS") {
        payload.appliedDepartment = appliedDepartment || "Computer Science";
        payload.semester = Number(semester);
        payload.shift = shift;
      } else {
        payload.discipline = discipline || "ICS";
        payload.part = Number(part);
        payload.shift = "Morning";
      }

      const response = await api.post("/api/admissions", payload);
      setAdmission(response.data);
    } catch (err: unknown) {
      console.error("Error submitting admission:", err);
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setErrorMsg(
        axiosErr.response?.data?.error || "Failed to submit admission. Please try again."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const nextStep = () => {
    setErrorMsg("");
    if (step === 1) {
      if (!phone.trim() || !fatherName.trim() || !cnic.trim()) {
        setErrorMsg("Please fill in all personal information fields.");
        return;
      }
      if (phone.length < 7) {
        setErrorMsg("Please enter a valid phone number (e.g. +251 912 345678).");
        return;
      }
      const faydaError = validateFaydaId(cnic);
      if (faydaError) {
        setErrorMsg(faydaError);
        return;
      }
      setStep(2);
    }
  };

  const prevStep = () => {
    setErrorMsg("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleCancelAdmission = async () => {
    setStatusLoading(true);
    try {
      await api.delete("/api/admissions/my-status");
      setAdmission(null);
      setStep(1);
      router.push("/onboarding");
    } catch (err) {
      console.error("Error cancelling/resetting admission:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  if (!isLoaded || statusLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0e0c18] text-zinc-900 dark:text-white flex flex-col items-center justify-center gap-3 transition-colors duration-300">
        <Loader2 className="animate-spin h-10 w-10 text-brand-primary dark:text-brand-secondary" />
        <p className="text-zinc-500 dark:text-zinc-400 font-medium animate-pulse text-sm">
          Securing portal onboarding...
        </p>
      </div>
    );
  }

  // Common Stepper Header titles
  const stepTitles = ["Personal Info", "Academic Records"];

  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden bg-white dark:bg-[#0e0c18] transition-colors duration-300">
      
      {/* ----------------- LEFT PANEL: Branding & Visuals (Hidden on mobile) ----------------- */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-brand-light via-brand-light/70 to-slate-100 dark:from-[#131022] dark:via-[#131022]/95 dark:to-[#090710] border-r border-zinc-200/50 dark:border-white/5 overflow-hidden transition-colors duration-300">
        
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-primary/10 dark:bg-brand-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-secondary/15 dark:bg-brand-secondary/10 blur-[120px] pointer-events-none" />
        
        {/* Dot Grid Background */}
        <div
          className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-brand-primary) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Top Branding Logo Section */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl bg-brand-primary/20 blur-md transition-all group-hover:bg-brand-primary/30" />
            <Image
              src="/collegelogo.png"
              alt="Nova Technology logo"
              width={56}
              height={56}
              className="relative z-10 drop-shadow-[0_0_15px_rgba(61,94,225,0.3)] transition-transform duration-500 group-hover:rotate-6 object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-primary dark:text-brand-secondary">
              Nova Technology
            </p>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              ERP Portal
            </p>
          </div>
        </div>

        {/* Middle Welcome and Guidance Content */}
        <div className="relative z-10 max-w-lg my-auto space-y-8 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 dark:border-brand-primary/30 bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-primary dark:text-brand-secondary shadow-xs">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Student Portal Setup
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight text-brand-dark dark:text-white">
            Setup Your Student Profile.
            <span className="block text-brand-primary mt-2">Finalize onboarding steps below.</span>
          </h1>
          
          <p className="text-base xl:text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            Please fill in your contact information, previous marks, shift, and target semester to submit your profile for admin verification.
          </p>

          {/* Stepper Feature list */}
          <div className="space-y-3 pt-2">
            {[
              { step: "1. Personal Info", desc: "Verify guardian's name, phone and Fayda ID." },
              { step: "2. Academic Profile", desc: "Select shift, department and target semester." },
              { step: "3. Admin Verification", desc: "Awaiting approval by the college administrator." },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-4 rounded-xl bg-white/60 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 px-5 py-3 shadow-xs transition-transform duration-250 hover:scale-[1.01]"
              >
                <div className="h-8 w-8 rounded-lg bg-brand-primary/10 dark:bg-brand-secondary/10 flex items-center justify-center text-brand-primary dark:text-brand-secondary shrink-0 font-bold text-sm">
                  {item.step[0]}
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{item.step}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright metadata */}
        <div className="relative z-10 text-xs text-zinc-400 dark:text-zinc-500 text-left">
          © {new Date().getFullYear()} Nova Technology. All rights reserved.
        </div>
      </div>

      {/* ----------------- RIGHT PANEL: Interactive Form & Wait Status ----------------- */}
      <div className="relative flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 md:px-12 overflow-y-auto">
        
        {/* User Button in Top Right */}
        <div className="absolute top-6 right-6 z-20">
          <UserButton afterSignOutUrl="/" />
        </div>

        <div className="w-full max-w-[520px] space-y-8">
          
          <AnimatePresence mode="wait">
            
            {/* VIEW A: PENDING REVIEW */}
            {admission && admission.status === "Pending" && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="text-center space-y-6"
              >
                <div className="mx-auto h-20 w-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                  <Clock className="h-10 w-10 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    Application Under Review
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Your profile details and admission fees are currently pending verification. Once payment is verified by the accountant, your enrollment and full dashboard access will unlock.
                  </p>
                  
                  <div className="flex justify-center pt-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      <span>Awaiting Fee Clearance & Approval</span>
                    </div>
                  </div>
                </div>

                <Card className="bg-white/40 dark:bg-[#131022]/40 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden text-left">
                  <div className="bg-zinc-50 dark:bg-white/5 px-5 py-4 border-b border-zinc-200/50 dark:border-white/5 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-brand-primary" />
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      Application Summary
                    </span>
                  </div>
                  <CardContent className="p-5 space-y-3.5 text-sm text-zinc-600 dark:text-zinc-300">
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">Full Name</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">{admission.studentName}</span>
                    </div>
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">Program Level</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right font-bold text-brand-primary">
                        {admission.programLevel === "INTERMEDIATE" ? "Intermediate (HSSC)" : "BS Degree"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">
                        {admission.programLevel === "INTERMEDIATE" ? "Discipline" : "Department"}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">
                        {admission.programLevel === "INTERMEDIATE"
                          ? (admission.discipline || admission.appliedDepartment)
                          : admission.appliedDepartment}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">
                        {admission.programLevel === "INTERMEDIATE" ? "Part" : "Semester & Shift"}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">
                        {admission.programLevel === "INTERMEDIATE"
                          ? `Part ${admission.part || admission.semester || 1}`
                          : `Semester ${admission.semester} • ${admission.shift}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">Fayda ID</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">{admission.cnic}</span>
                    </div>
                    <div className="grid grid-cols-2 py-1">
                      <span className="text-zinc-500">Previous Marks</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">
                        {admission.marksObtained} / {admission.totalMarks}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={() => checkStatus(true)}
                    disabled={refreshing}
                    className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white h-11 px-6 font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(61,94,225,0.2)] flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Check Approval Status
                  </Button>
                  <Button
                    onClick={handleCancelAdmission}
                    variant="outline"
                    className="w-full border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 h-11 rounded-xl"
                  >
                    Cancel & Re-submit
                  </Button>
                </div>
              </motion.div>
            )}

            {/* VIEW B: APPROVED – Finalising setup */}
            {admission && admission.status === "Approved" && (
              <motion.div
                key="approved"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="text-center space-y-6"
              >
                <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    Application Approved!
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Your admission has been approved. We&apos;re finalising your student account now. Click below to enter your dashboard.
                  </p>
                </div>

                <Card className="bg-white/40 dark:bg-[#131022]/40 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden text-left">
                  <div className="bg-zinc-50 dark:bg-white/5 px-5 py-4 border-b border-zinc-200/50 dark:border-white/5 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      Admission Summary
                    </span>
                  </div>
                  <CardContent className="p-5 space-y-3.5 text-sm text-zinc-600 dark:text-zinc-300">
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">Full Name</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">{admission.studentName}</span>
                    </div>
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">
                        {admission.programLevel === "INTERMEDIATE" ? "Discipline" : "Department"}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">
                        {admission.programLevel === "INTERMEDIATE"
                          ? (admission.discipline || admission.appliedDepartment)
                          : admission.appliedDepartment}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 py-1">
                      <span className="text-zinc-500">
                        {admission.programLevel === "INTERMEDIATE" ? "Part" : "Semester & Shift"}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">
                        {admission.programLevel === "INTERMEDIATE"
                          ? `Part ${admission.part || admission.semester || 1}`
                          : `Semester ${admission.semester} • ${admission.shift}`}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center pt-2">
                  <Button
                    onClick={() => checkStatus(true)}
                    disabled={refreshing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
                  >
                    {refreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Go to Dashboard
                  </Button>
                </div>
              </motion.div>
            )}

            {/* VIEW C: REJECTED SCREEN */}
            {admission && admission.status === "Rejected" && !blocked && (
              <motion.div
                key="rejected"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="text-center space-y-6"
              >
                <div className="mx-auto h-20 w-20 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <AlertCircle className="h-10 w-10 animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    Onboarding Rejected
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Unfortunately, your profile details were not approved by the administration. You can correct your information and re-apply.
                  </p>
                  {rejectedCount >= 1 && (
                    <div className="flex items-center gap-2 justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400 font-medium mt-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>You have {2 - rejectedCount} attempt{2 - rejectedCount !== 1 ? "s" : ""} remaining. After 2 rejections your account will be blocked.</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setAdmission(null);
                      setStep(1);
                    }}
                    className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white h-11 font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(61,94,225,0.2)]"
                  >
                    Re-submit Registration Details
                  </Button>
                </div>
              </motion.div>
            )}

            {/* VIEW D: BLOCKED SCREEN */}
            {blocked && (
              <motion.div
                key="blocked"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="text-center space-y-6"
              >
                <div className="mx-auto h-20 w-20 rounded-full bg-zinc-500/10 border-2 border-zinc-500/30 flex items-center justify-center text-zinc-500 shadow-[0_0_20px_rgba(113,113,122,0.1)]">
                  <ShieldOff className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    Account Blocked
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Your admission has been rejected {rejectedCount} time{rejectedCount !== 1 ? "s" : ""}. Your account has been locked by the system.
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Please visit the <strong className="text-zinc-700 dark:text-zinc-200">Admin Office</strong> at Nova Technology to request reactivation of your admission access.
                  </p>
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    onClick={() => checkStatus(true)}
                    disabled={refreshing}
                    variant="outline"
                    className="border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 h-11 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Check If Unblocked
                  </Button>
                </div>
              </motion.div>
            )}

            {/* VIEW E: MULTI-STEP REGISTRATION FORM */}
            {!admission && (
              <motion.div
                key="form-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-2 text-center lg:text-left">
                  <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    Setup Profile Details
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Submit your academic and contact details to proceed with portal onboarding.
                  </p>
                </div>

                {/* Stepper indicator line */}
                <div className="relative flex items-center justify-between px-4 max-w-sm mx-auto lg:mx-0">
                  {stepTitles.map((title, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 relative z-10">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                          step > i + 1
                            ? "bg-brand-primary text-white"
                            : step === i + 1
                            ? "bg-brand-primary text-white ring-4 ring-brand-primary/20"
                            : "bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-white/5"
                        }`}
                      >
                        {step > i + 1 ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">{title}</span>
                    </div>
                  ))}
                  {/* Step Connector Line */}
                  <div className="absolute top-4.5 left-8 right-8 h-0.5 bg-zinc-200 dark:bg-white/5 z-0">
                    <motion.div
                      className="h-full bg-brand-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: `${((step - 1) / (stepTitles.length - 1)) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                <Card className="bg-white/40 dark:bg-[#131022]/40 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                  <CardContent className="p-6 md:p-8">
                    {errorMsg && (
                      <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500 dark:text-red-400 font-medium">
                        <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                        <p>{errorMsg}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <AnimatePresence mode="wait">
                        
                        {/* Step 1: Personal & Level Choice */}
                        {step === 1 && (
                          <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                          >
                            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-white/5 pb-2">
                              1. Select Academic Program Level
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setProgramLevel("BS");
                                  setAppliedDepartment("Computer Science");
                                }}
                                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between group ${
                                  programLevel === "BS"
                                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-bold shadow-md ring-2 ring-brand-primary/20"
                                    : "border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="h-5 w-5 text-brand-primary shrink-0" />
                                  <span className="font-extrabold text-sm text-zinc-900 dark:text-white">BS Degree</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-snug">
                                  4-Year Undergraduate (8 Semesters, Shift choice)
                                </p>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setProgramLevel("INTERMEDIATE");
                                  setDiscipline("ICS");
                                }}
                                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between group ${
                                  programLevel === "INTERMEDIATE"
                                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-bold shadow-md ring-2 ring-brand-primary/20"
                                    : "border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <BookMarked className="h-5 w-5 text-brand-primary shrink-0" />
                                  <span className="font-extrabold text-sm text-zinc-900 dark:text-white">Intermediate</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-snug">
                                  HSSC College Level (F.Sc, ICS, FA, I.Com - Part 1/2)
                                </p>
                              </button>
                            </div>

                            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-white/5 pb-2 pt-2">
                              Personal Information
                            </h3>

                            <div className="space-y-1.5">
                              <Label htmlFor="fatherName" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                Parent / Guardian Name
                              </Label>
                              <Input
                                id="fatherName"
                                type="text"
                                placeholder="Your parent or guardian's full name"
                                value={fatherName}
                                onChange={(e) => setFatherName(e.target.value)}
                                className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="phone" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                Phone Number
                              </Label>
                              <Input
                                id="phone"
                                type="tel"
                                placeholder="e.g. +251 912 345678"
                                value={phone}
                                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                                className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="cnic" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                Fayda ID Number
                              </Label>
                              <Input
                                id="cnic"
                                type="text"
                                inputMode="numeric"
                                placeholder="12-digit Fayda ID (e.g. 234567891012)"
                                value={cnic}
                                onChange={(e) => setCnic(formatCNIC(e.target.value))}
                                className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                              />
                            </div>

                            <div className="flex justify-between pt-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/onboarding")}
                                className="border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 h-11 px-5 rounded-xl font-bold transition-all"
                              >
                                Back to Roles
                              </Button>
                              <Button
                                type="button"
                                onClick={nextStep}
                                className="bg-brand-primary hover:bg-brand-primary/95 text-white h-11 px-5 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-[0.98]"
                              >
                                Next Step <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {/* Step 2: Academic Profile */}
                        {step === 2 && (
                          <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
                              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                                Academic Profile ({programLevel === "BS" ? "BS Degree" : "Intermediate HSSC"})
                              </h3>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
                                {programLevel === "BS" ? "Undergraduate" : "HSSC Level"}
                              </span>
                            </div>

                            {programLevel === "BS" ? (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label htmlFor="dept" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                      Target Department
                                    </Label>
                                    <Select
                                      value={appliedDepartment}
                                      onValueChange={setAppliedDepartment}
                                    >
                                      <SelectTrigger id="dept" className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl h-11 px-3">
                                        <SelectValue placeholder="Select dept" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white dark:bg-[#110d22] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                                        {DEPARTMENTS.map((dept) => (
                                          <SelectItem key={dept} value={dept} className="focus:bg-brand-primary focus:text-white">
                                            {dept}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label htmlFor="semester" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                      Semester
                                    </Label>
                                    <Select value={semester} onValueChange={setSemester}>
                                      <SelectTrigger id="semester" className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl h-11 px-3">
                                        <SelectValue placeholder="Select semester" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white dark:bg-[#110d22] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                          <SelectItem key={sem} value={sem.toString()} className="focus:bg-brand-primary focus:text-white">
                                            Semester {sem}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <Label htmlFor="shift" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                    Shift
                                  </Label>
                                  <Select value={shift} onValueChange={setShift}>
                                    <SelectTrigger id="shift" className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl h-11 px-3">
                                      <SelectValue placeholder="Select shift" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#110d22] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                                      <SelectItem value="Morning" className="focus:bg-brand-primary focus:text-white">Morning</SelectItem>
                                      <SelectItem value="Evening" className="focus:bg-brand-primary focus:text-white">Evening</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label htmlFor="discipline" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                    Intermediate Field / Discipline
                                  </Label>
                                  <Select value={discipline} onValueChange={setDiscipline}>
                                    <SelectTrigger id="discipline" className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl h-11 px-3">
                                      <SelectValue placeholder="Select field" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#110d22] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                                      {INTERMEDIATE_DISCIPLINES.map((disc) => (
                                        <SelectItem key={disc} value={disc} className="focus:bg-brand-primary focus:text-white">
                                          {disc}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1.5">
                                  <Label htmlFor="part" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                    Academic Part
                                  </Label>
                                  <Select value={part} onValueChange={setPart}>
                                    <SelectTrigger id="part" className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl h-11 px-3">
                                      <SelectValue placeholder="Select part" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#110d22] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                                      <SelectItem value="1" className="focus:bg-brand-primary focus:text-white">Part 1</SelectItem>
                                      <SelectItem value="2" className="focus:bg-brand-primary focus:text-white">Part 2</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <Label htmlFor="prevInst" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                Previous Institution / School
                              </Label>
                              <Input
                                id="prevInst"
                                type="text"
                                placeholder="School or college last attended"
                                value={previousInstitution}
                                onChange={(e) => setPreviousInstitution(e.target.value)}
                                className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label htmlFor="marks" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                  Marks Obtained
                                </Label>
                                <Input
                                  id="marks"
                                  type="number"
                                  placeholder="e.g. 950"
                                  value={marksObtained}
                                  onChange={(e) => setMarksObtained(e.target.value)}
                                  className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="total" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
                                  Total Marks
                                </Label>
                                <Input
                                  id="total"
                                  type="number"
                                  placeholder="e.g. 1100"
                                  value={totalMarks}
                                  onChange={(e) => setTotalMarks(e.target.value)}
                                  className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                                />
                              </div>
                            </div>

                            <div className="flex justify-between pt-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                className="border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 h-11 px-5 rounded-xl font-bold transition-all"
                              >
                                Back
                              </Button>
                              <Button
                                type="submit"
                                disabled={submitLoading}
                                className="bg-brand-primary hover:bg-brand-primary/95 text-white h-11 px-6 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(61,94,225,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.98] cursor-pointer"
                              >
                                {submitLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <BookOpen className="h-4 w-4" />
                                )}
                                Submit Application
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

    </div>
  );
}
