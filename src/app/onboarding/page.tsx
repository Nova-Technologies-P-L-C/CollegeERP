"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { api } from "@/lib/axios";
import { DEPARTMENTS } from "@/lib/constants";
import {
  Clock,
  ArrowRight,
  Loader2,
  Sparkles,
  RefreshCw,
  BookOpen,
  GraduationCap,
  Shield,
  Briefcase,
  AlertCircle,
  Phone,
  Settings,
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

interface RequestDetails {
  id: string;
  name: string;
  email: string;
  role: "FACULTY" | "ADMIN";
  phone: string | null;
  department: string | null;
  specialization: string | null;
  status: "Pending" | "Approved" | "Rejected";
}

interface AdmissionDetails {
  id: string;
  studentName: string;
  email: string;
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

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Status and loading states
  const [statusLoading, setStatusLoading] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<RequestDetails | null>(null);
  const [pendingAdmission, setPendingAdmission] = useState<AdmissionDetails | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);

  // Form states
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "FACULTY" | "ADMIN" | null>(null);
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const checkStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const timestamp = Date.now();
      const res = await api.get(`/api/onboarding/status?t=${timestamp}`);
      const statusData = res.data;
      console.log("[Onboarding Status Check] API Response Data:", statusData);

      if (statusData.hasProfile) {
        console.log("[Onboarding Status Check] Profile exists. Redirecting to dashboard...");
        router.push("/dashboard");
        return;
      }

      const isFirst = !!statusData.isFirstAdmin;
      console.log("[Onboarding Status Check] isFirstAdmin evaluated to:", isFirst);
      setIsFirstAdmin(isFirst);
      setPendingRequest(statusData.request || null);
      setPendingAdmission(statusData.admission || null);
    } catch (err) {
      console.error("[Onboarding Status Check] Error checking onboarding status:", err);
    } finally {
      setStatusLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    checkStatus();
  }, [isLoaded, user, checkStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRole) return;
    setErrorMsg("");

    if (selectedRole === "STUDENT") {
      router.push("/student-setup");
      return;
    }

    if (!phone.trim()) {
      setErrorMsg("Phone number is required.");
      return;
    }

    if (phone.length < 7) {
      setErrorMsg("Please enter a valid phone number (e.g. +251 912 345678).");
      return;
    }

    if (selectedRole === "FACULTY") {
      if (!department) {
        setErrorMsg("Please select your department.");
        return;
      }
      if (!specialization.trim()) {
        setErrorMsg("Please enter your area of specialization.");
        return;
      }
    }

    if (selectedRole === "ADMIN") {
      if (!specialization.trim()) {
        setErrorMsg("Please enter your designation.");
        return;
      }
      if (!isFirstAdmin && !adminSecret.trim()) {
        setErrorMsg("Admin verification secret key is required.");
        return;
      }
    }

    setSubmitLoading(true);
    try {
      const res = await api.post("/api/onboarding", {
        role: selectedRole,
        phone,
        department: selectedRole === "FACULTY" ? department : undefined,
        specialization: (selectedRole === "FACULTY" || selectedRole === "ADMIN") ? specialization : undefined,
        adminSecret: selectedRole === "ADMIN" ? adminSecret : undefined,
      });

      const data = res.data;
      setPendingRequest(data);
      if (data.status === "Approved") {
        // Force full reload to dashboard to ensure Clerk claims are completely refreshed
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      console.error("Error submitting onboarding request:", err);
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setErrorMsg(
        axiosErr.response?.data?.error || "Failed to submit onboarding request. Please try again."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReset = async () => {
    setStatusLoading(true);
    try {
      await api.delete("/api/onboarding");
      setPendingRequest(null);
      setPendingAdmission(null);
      setSelectedRole(null);
      setPhone("");
      setDepartment("");
      setSpecialization("");
      setAdminSecret("");
      // Recheck status to update isFirstAdmin
      await checkStatus();
    } catch (err) {
      console.error("Error resetting request:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  if (!isLoaded || statusLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0e0c18] text-zinc-900 dark:text-white flex flex-col items-center justify-center gap-3 transition-colors duration-300">
        <Loader2 className="animate-spin h-10 w-10 text-brand-primary dark:text-brand-secondary" />
        <p className="text-zinc-500 dark:text-zinc-400 font-medium animate-pulse text-sm">
          Loading onboarding portal...
        </p>
      </div>
    );
  }

  // If student already has a pending student request, direct them to /student-setup page
  if (pendingAdmission) {
    router.push("/student-setup");
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden bg-white dark:bg-[#0e0c18] transition-colors duration-300">
      
      {/* LEFT PANEL: Branding & Info */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-brand-light via-brand-light/70 to-slate-100 dark:from-[#131022] dark:via-[#131022]/95 dark:to-[#090710] border-r border-zinc-200/50 dark:border-white/5 overflow-hidden transition-colors duration-300">
        
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-primary/10 dark:bg-brand-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-secondary/15 dark:bg-brand-secondary/10 blur-[120px] pointer-events-none" />
        
        {/* Dot Grid */}
        <div
          className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-brand-primary) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Branding Logo */}
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

        {/* Welcome Message */}
        <div className="relative z-10 max-w-lg my-auto space-y-8 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 dark:border-brand-primary/30 bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-primary dark:text-brand-secondary shadow-xs">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Portal Registration Onboarding
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight text-brand-dark dark:text-white">
            Welcome to the Campus Portal.
            <span className="block text-brand-primary mt-2">Select your role and setup your account.</span>
          </h1>
          
          <p className="text-base xl:text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            Please register your account with your correct credentials. All requests will be queued for administrator review before portal verification is completed.
          </p>

          {/* Steps */}
          <div className="space-y-3 pt-2">
            {[
              { step: "1. Choose Your Role", desc: "Select Student, Faculty Member, or Administrator." },
              { step: "2. Input Profile Details", desc: "Complete contact info and department details." },
              { step: "3. Wait for Approval", desc: "Admin will verify and provision your dashboard access." },
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

        <div className="relative z-10 text-xs text-zinc-400 dark:text-zinc-500 text-left">
          © {new Date().getFullYear()} Nova Technology. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL: Form & Status reviews */}
      <div className="relative flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 md:px-12 overflow-y-auto">
        <div className="absolute top-6 right-6 z-20">
          <UserButton afterSignOutUrl="/" />
        </div>

        <div className="w-full max-w-[520px] space-y-8">
          <AnimatePresence mode="wait">
            
            {/* VIEW A: PENDING REVIEW */}
            {pendingRequest && pendingRequest.status === "Pending" && (
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
                    Your onboarding profile has been submitted and is currently pending administrator verification. Once approved, your portal dashboard will unlock.
                  </p>
                  
                  <div className="flex justify-center pt-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      <span>Pending Admin Approval</span>
                    </div>
                  </div>
                </div>

                <Card className="bg-white/40 dark:bg-[#131022]/40 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden text-left">
                  <div className="bg-zinc-50 dark:bg-white/5 px-5 py-4 border-b border-zinc-200/50 dark:border-white/5 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-brand-primary" />
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      Request Summary
                    </span>
                  </div>
                  <CardContent className="p-5 space-y-3.5 text-sm text-zinc-600 dark:text-zinc-300">
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">Full Name</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">{pendingRequest.name}</span>
                    </div>
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">Requested Role</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right capitalize">{pendingRequest.role.toLowerCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-zinc-500">Phone Number</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-right">{pendingRequest.phone}</span>
                    </div>
                    {pendingRequest.role === "FACULTY" && (
                      <>
                        <div className="grid grid-cols-2 py-1 border-b border-zinc-100 dark:border-white/5">
                          <span className="text-zinc-500">Department</span>
                          <span className="font-semibold text-zinc-900 dark:text-white text-right">{pendingRequest.department}</span>
                        </div>
                        <div className="grid grid-cols-2 py-1">
                          <span className="text-zinc-500">Specialization</span>
                          <span className="font-semibold text-zinc-900 dark:text-white text-right">{pendingRequest.specialization}</span>
                        </div>
                      </>
                    )}
                    {pendingRequest.role === "ADMIN" && (
                      <div className="grid grid-cols-2 py-1">
                        <span className="text-zinc-500">Designation</span>
                        <span className="font-semibold text-zinc-900 dark:text-white text-right">{pendingRequest.specialization}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={() => checkStatus(true)}
                    disabled={refreshing}
                    className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white h-11 px-6 font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(61,94,225,0.2)] flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Check Status
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 h-11 rounded-xl"
                  >
                    Cancel & Re-submit
                  </Button>
                </div>
              </motion.div>
            )}

            {/* VIEW B: REJECTED SCREEN */}
            {pendingRequest && pendingRequest.status === "Rejected" && (
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
                    Registration Rejected
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Unfortunately, your registration details were rejected by the administrator. Please click below to reset your choice and re-apply.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleReset}
                    className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white h-11 font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(61,94,225,0.2)]"
                  >
                    Reset & Re-submit Details
                  </Button>
                </div>
              </motion.div>
            )}

            {/* VIEW C: ROLE SELECT & FORMS */}
            {!pendingRequest && (
              <motion.div
                key="onboarding-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {selectedRole === null ? (
                  /* Role Selection */
                  <div className="space-y-6">
                    <div className="space-y-2 text-center lg:text-left">
                      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                        Choose Portal Role
                      </h1>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Please select the account role you want to setup.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Student Card */}
                      <button
                        onClick={() => router.push("/student-setup")}
                        className="flex items-center gap-4 p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#131022]/40 hover:border-brand-primary dark:hover:border-brand-primary transition-all text-left group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:scale-105 transition-transform duration-300">
                          <GraduationCap className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-zinc-800 dark:text-white">Student Onboarding</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Submit academic credentials, marks, and apply for admissions.</p>
                        </div>
                        <ArrowRight className="h-5 w-5 ml-auto text-zinc-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                      </button>

                      {/* Faculty Card */}
                      <button
                        onClick={() => setSelectedRole("FACULTY")}
                        className="flex items-center gap-4 p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#131022]/40 hover:border-brand-primary dark:hover:border-brand-primary transition-all text-left group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform duration-300">
                          <Briefcase className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-zinc-800 dark:text-white">Faculty Onboarding</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Submit department, specialization, and check assigned classes.</p>
                        </div>
                        <ArrowRight className="h-5 w-5 ml-auto text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </button>

                      {/* Admin Card */}
                      <button
                        onClick={() => setSelectedRole("ADMIN")}
                        className="flex items-center gap-4 p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#131022]/40 hover:border-brand-primary dark:hover:border-brand-primary transition-all text-left group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform duration-300">
                          <Settings className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-zinc-800 dark:text-white">Administrator Onboarding</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Request administrative credentials to manage college assets and users.</p>
                        </div>
                        <ArrowRight className="h-5 w-5 ml-auto text-zinc-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form Submission */
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setSelectedRole(null)}
                        variant="ghost"
                        className="text-xs text-zinc-500 dark:text-zinc-400 p-0 hover:bg-transparent"
                      >
                        ← Back to roles
                      </Button>
                    </div>
                    
                    <div className="space-y-2 text-center lg:text-left">
                      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white capitalize">
                        Setup {selectedRole.toLowerCase()} Profile
                      </h1>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Submit registration details to send request for verification.
                      </p>
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
                          <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" /> Phone Number
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

                          {selectedRole === "FACULTY" && (
                            <>
                              <div className="space-y-1.5">
                                <Label htmlFor="dept" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs flex items-center gap-1">
                                  <GraduationCap className="h-3.5 w-3.5" /> Department
                                </Label>
                                <Select value={department} onValueChange={setDepartment}>
                                  <SelectTrigger id="dept" className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl h-11 px-3">
                                    <SelectValue placeholder="Select department" />
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
                                <Label htmlFor="specialization" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs flex items-center gap-1">
                                  <Shield className="h-3.5 w-3.5" /> Specialization
                                </Label>
                                <Input
                                  id="specialization"
                                  type="text"
                                  placeholder="e.g. Artificial Intelligence, Organic Chemistry"
                                  value={specialization}
                                  onChange={(e) => setSpecialization(e.target.value)}
                                  className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                                />
                              </div>
                            </>
                          )}

                          {selectedRole === "ADMIN" && (
                            <>
                              <div className="space-y-1.5">
                                <Label htmlFor="specialization" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs flex items-center gap-1">
                                  <Shield className="h-3.5 w-3.5" /> Designation
                                </Label>
                                <Input
                                  id="specialization"
                                  type="text"
                                  placeholder="e.g. Vice Principal, Registrar, IT Specialist"
                                  value={specialization}
                                  onChange={(e) => setSpecialization(e.target.value)}
                                  className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                                />
                              </div>

                              {isFirstAdmin ? (
                                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.05)] mt-2">
                                  <Shield className="h-5 w-5 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
                                  <div className="space-y-1 text-xs leading-relaxed text-left">
                                    <p className="font-bold text-amber-600 dark:text-amber-400">Initial System Setup</p>
                                    <p className="text-zinc-500 dark:text-zinc-400">
                                      No active Administrators exist in the database. You are registering the primary system Administrator. No verification secret key is required.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <Label htmlFor="adminSecret" className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs flex items-center gap-1">
                                    <Shield className="h-3.5 w-3.5" /> Admin Verification Secret Key
                                  </Label>
                                  <Input
                                    id="adminSecret"
                                    type="password"
                                    placeholder="Enter the secret key to request Admin access"
                                    value={adminSecret}
                                    onChange={(e) => setAdminSecret(e.target.value)}
                                    className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary rounded-xl h-11 px-3"
                                  />
                                </div>
                              )}
                            </>
                          )}

                          <div className="flex justify-end pt-3">
                            <Button
                              type="submit"
                              disabled={submitLoading}
                              className="bg-brand-primary hover:bg-brand-primary/95 text-white h-11 px-6 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(61,94,225,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.98] cursor-pointer w-full justify-center"
                            >
                              {submitLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <BookOpen className="h-4 w-4" />
                              )}
                              {selectedRole === "ADMIN" && isFirstAdmin ? "Create First Admin" : "Submit Request"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
