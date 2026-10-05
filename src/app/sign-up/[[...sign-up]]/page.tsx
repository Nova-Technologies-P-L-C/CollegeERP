"use client";

import { useSanctumAuth } from "@/context/SanctumAuthContext";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, UserCheck, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const { register } = useSanctumAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Registration Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Interaction states
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSocialSignUp = async () => {
    setError("Social sign-up with Google is disabled in self-hosted Sanctum mode. Please sign up with your email & password.");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const res = await register({
        name: fullName || "New User",
        email: email.trim(),
        password,
      });

      if (res.success) {
        router.push("/onboarding");
      } else {
        setError(res.error || "Failed to create account. Please check inputs.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please check inputs.");
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
      
      {/* Left Panel - Branding (Hidden on mobile) */}
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
            Nova Technology Enterprise
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight text-brand-dark dark:text-white">
            Join Our College Community.
            <span className="block text-brand-primary mt-2">Get started with unified portal access.</span>
          </h1>
          
          <p className="text-base xl:text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            Create your account to access educational tools, class schedules, assignments, and grades dynamically. Choose your appropriate view below.
          </p>

          {/* Feature list for Sign Up */}
          <div className="space-y-3 pt-2">
            {[
              { role: "Students", desc: "Access courses, grades & weekly timetables" },
              { role: "Faculty", desc: "Manage classes, quizzes & student attendance" },
              { role: "Administrators", desc: "Oversee college admissions, fee structures & audits" },
            ].map((item) => (
              <div
                key={item.role}
                className="flex items-center gap-4 rounded-xl bg-white/60 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 px-5 py-3 shadow-xs hover:scale-102 transition-transform duration-200"
              >
                <div className="h-8 w-8 rounded-lg bg-brand-primary/10 dark:bg-brand-secondary/10 flex items-center justify-center text-brand-primary dark:text-brand-secondary shrink-0">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{item.role}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 text-xs text-zinc-400 dark:text-zinc-500">
          © {new Date().getFullYear()} Nova Technology. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Sign Up Form */}
      <div className="relative flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 md:px-12">
        
        {/* Navigation & Theme Actions */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white flex items-center gap-2 text-sm font-medium transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Home
          </Link>
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[400px]">
          
          {/* Mobile Branding Header */}
          <div className="flex flex-col items-center text-center lg:hidden mb-6">
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

          <div className="relative overflow-hidden w-full">
            
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6 w-full"
              >
                <Card className="bg-white/40 dark:bg-[#131022]/40 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-2xl rounded-2xl p-6 transition-all duration-300">
                  <CardHeader className="p-0 pb-6">
                    <CardTitle className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                      Create Your Account
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                      Register to get started with college portal access
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 space-y-5">
                    {/* Error block */}
                    {error && (
                      <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3.5 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                        <p className="leading-relaxed font-medium">{error}</p>
                      </div>
                    )}

                    {/* Social Login buttons */}
                    <Button
                      variant="outline"
                      type="button"
                      disabled={loading || !!socialLoading}
                      onClick={() => handleSocialSignUp()}
                      className="w-full border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 rounded-lg h-10 flex items-center justify-center font-semibold text-sm transition-all cursor-pointer"
                    >
                      {socialLoading === "google" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Continue with Google
                        </>
                      )}
                    </Button>

                    <div className="flex items-center gap-2 w-full">
                      <div className="h-px bg-zinc-200 dark:bg-white/10 grow" />
                      <span className="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-widest shrink-0 px-2">
                        Or continue with email
                      </span>
                      <div className="h-px bg-zinc-200 dark:bg-white/10 grow" />
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName" className="text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                            First Name
                          </Label>
                          <Input
                            id="firstName"
                            type="text"
                            required
                            disabled={loading}
                            placeholder="Ali"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary dark:focus:border-brand-primary focus:ring-brand-primary/20 transition-all h-10 rounded-lg px-3"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName" className="text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                            Last Name
                          </Label>
                          <Input
                            id="lastName"
                            type="text"
                            required
                            disabled={loading}
                            placeholder="Abbas"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary dark:focus:border-brand-primary focus:ring-brand-primary/20 transition-all h-10 rounded-lg px-3"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          disabled={loading}
                          placeholder="name@novatechnology.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-primary dark:focus:border-brand-primary focus:ring-brand-primary/20 transition-all h-10 rounded-lg px-3"
                        />
                      </div>

                      <div className="space-y-1.5 relative">
                        <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            required
                            disabled={loading}
                            placeholder="Choose a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(61,94,225,0.15)] hover:shadow-[0_0_25px_rgba(61,94,225,0.3)] h-10 rounded-lg cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Register
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Already have an account?{" "}
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
      </div>
    </div>
  );
}
