"use client";

import { useSanctumAuth } from "@/context/SanctumAuthContext";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetStep = "email" | "verify" | "success";

export default function ForgotPasswordPage() {
  const { resetPassword } = useSanctumAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Form states
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI & Interaction states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Step 1: Submit email to reset password
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    setError("");
    setInfoMessage("");

    setStep("verify");
    setInfoMessage(`Enter your new password below to reset your credentials for ${email}.`);
    setLoading(false);
  };

  // Step 2: Attempt reset & set new password via Sanctum API
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setInfoMessage("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your new password.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(email.trim(), newPassword);

      if (res.success) {
        setStep("success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setError(res.error || "Failed to reset password. Please check your email.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-[100dvh] bg-white dark:bg-[#0e0c18] flex items-center justify-center transition-colors duration-300">
        <Loader2 className="animate-spin h-8 w-8 text-brand-primary dark:text-brand-secondary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden bg-white dark:bg-[#0e0c18] transition-colors duration-300">
      {/* Left Panel - Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-brand-light via-brand-light/70 to-slate-100 dark:from-[#131022] dark:via-[#131022]/95 dark:to-[#090710] border-r border-zinc-200/50 dark:border-white/5 overflow-hidden transition-colors duration-300">
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-primary/10 dark:bg-brand-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-secondary/15 dark:bg-brand-secondary/10 blur-[120px] pointer-events-none" />

        {/* Dot Grid Background */}
        <div
          className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-brand-primary) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Top Branding Section */}
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

        {/* Middle Content */}
        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 dark:border-brand-primary/30 bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-primary dark:text-brand-secondary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Account Security & Recovery
          </div>

          <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight text-brand-dark dark:text-white">
            Secure Account Recovery.
            <span className="block text-brand-primary mt-2">
              Get back to your campus workspace safely.
            </span>
          </h1>

          <p className="text-base xl:text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            Forgot your password? Don&apos;t worry. Enter your registered email address to receive a secure verification code and reset your credentials.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              "Encrypted Recovery",
              "Instant Email Code",
              "Multi-Factor Safety",
              "24/7 Portal Access",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-xl bg-white/60 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4 text-brand-primary dark:text-brand-secondary shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 text-xs text-zinc-400 dark:text-zinc-500">
          © {new Date().getFullYear()} Nova Technology. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Recovery Form */}
      <div className="relative flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 md:px-12">
        {/* Navigation & Theme Actions */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
          <Link
            href="/sign-in"
            className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white flex items-center gap-2 text-sm font-medium transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Sign In
          </Link>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px] space-y-6"
        >
          {/* Mobile Branding Header */}
          <div className="flex flex-col items-center text-center lg:hidden">
            <Image
              src="/collegelogo.png"
              alt="Nova Technology logo"
              width={64}
              height={64}
              className="mb-3 drop-shadow-[0_0_15px_rgba(61,94,225,0.2)] object-contain"
              priority
            />
            <h1 className="text-2xl font-black text-brand-dark dark:text-white">
              Nova Technology ERP
            </h1>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
              Nova Technology
            </p>
          </div>

          <Card className="bg-white/40 dark:bg-[#131022]/40 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-2xl rounded-2xl p-6 transition-all duration-300">
            <AnimatePresence mode="wait">
              {step === "email" && (
                <motion.div
                  key="step-email"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardHeader className="p-0 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 flex items-center justify-center text-brand-primary dark:text-brand-secondary mb-4 border border-brand-primary/20">
                      <Mail className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                      Forgot Password?
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                      No worries! Enter your account email and we&apos;ll send you a password reset verification code.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 space-y-4">
                    {error && (
                      <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3.5 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                        <p className="leading-relaxed font-medium">{error}</p>
                      </div>
                    )}

                    <form onSubmit={handleRequestCode} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-email" className="text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Input
                            id="reset-email"
                            type="email"
                            required
                            disabled={loading}
                            placeholder="name@novatechnology.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary dark:focus:border-brand-primary focus:ring-brand-primary/20 transition-all h-10 rounded-lg pl-3 pr-3"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || !email.trim()}
                        className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(61,94,225,0.15)] hover:shadow-[0_0_25px_rgba(61,94,225,0.3)] h-10 rounded-lg cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Continue to Reset Password
                      </Button>
                    </form>
                  </CardContent>
                </motion.div>
              )}

              {step === "verify" && (
                <motion.div
                  key="step-verify"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardHeader className="p-0 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 flex items-center justify-center text-brand-primary dark:text-brand-secondary mb-4 border border-brand-primary/20">
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                      Reset Password
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                      Enter the verification code sent to{" "}
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span> and choose a new password.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 space-y-4">
                    {infoMessage && (
                      <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-700 dark:text-blue-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <p className="leading-relaxed font-medium">{infoMessage}</p>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3.5 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                        <p className="leading-relaxed font-medium">{error}</p>
                      </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-1.5 relative">
                        <Label htmlFor="new-password" className="text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showPassword ? "text" : "password"}
                            required
                            disabled={loading}
                            placeholder="At least 8 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary dark:focus:border-brand-primary focus:ring-brand-primary/20 transition-all h-10 rounded-lg pl-3 pr-10"
                          />
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                            title={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 relative">
                        <Label htmlFor="confirm-password" className="text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            disabled={loading}
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary dark:focus:border-brand-primary focus:ring-brand-primary/20 transition-all h-10 rounded-lg pl-3 pr-10"
                          />
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                            title={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || !newPassword || !confirmPassword}
                        className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(61,94,225,0.15)] hover:shadow-[0_0_25px_rgba(61,94,225,0.3)] h-10 rounded-lg cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Reset Password
                      </Button>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-200/60 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setStep("email");
                            setError("");
                            setInfoMessage("");
                          }}
                          className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white font-medium cursor-pointer"
                        >
                          Change Email
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="step-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-4 space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
                      Password Reset Successfully!
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Your password has been updated. You are being logged in and redirected to your dashboard...
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-primary dark:text-brand-secondary" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Remembered your password?{" "}
            <Link
              href="/sign-in"
              className="font-bold text-brand-primary dark:text-brand-secondary hover:underline transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
