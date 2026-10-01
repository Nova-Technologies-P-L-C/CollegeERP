"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, LayoutDashboard, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard component error:", error);
  }, [error]);

  const isDbError =
    error?.message?.includes("database") ||
    error?.message?.includes("Prisma") ||
    error?.message?.includes("connect") ||
    error?.message?.includes("ECONNREFUSED") ||
    error?.message?.includes("unavailable");

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-rose-500/10 dark:bg-rose-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-brand-primary/10 dark:bg-brand-secondary/15 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-lg bg-white/70 dark:bg-[#131022]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl text-center flex flex-col items-center z-10 transition-colors"
      >
        {/* Animated Badge Icon */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-2 rounded-full bg-rose-500/20 dark:bg-rose-500/30 blur-lg transition-all group-hover:bg-rose-500/40" />
          <div className="relative w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-md">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>

        {/* Badge Indicator */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 px-3 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-3">
          <Sparkles className="w-3 h-3" />
          {isDbError ? "Database Connection Issue" : "Module Notice"}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
          {isDbError ? "Connection Temporarily Interrupted" : "Something Went Wrong"}
        </h2>

        {/* Description */}
        <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mb-8 leading-relaxed">
          {isDbError
            ? "We are unable to reach the database server right now. Your data is safe. Please wait a moment and refresh."
            : "An unexpected error occurred while rendering this module view. Please try reloading or returning to the dashboard."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(61,94,225,0.25)] hover:shadow-[0_0_25px_rgba(61,94,225,0.4)] transition-all duration-200 cursor-pointer active:scale-98 text-sm"
          >
            <RefreshCw className="w-4 h-4 animate-spin-hover" />
            Reload Module
          </button>
          
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 font-semibold rounded-xl transition-all duration-200 cursor-pointer active:scale-98 text-sm"
          >
            <LayoutDashboard className="w-4 h-4" />
            Main Dashboard
          </Link>
        </div>

        {/* Error Digest Info */}
        {error.digest && (
          <div className="mt-8 pt-4 border-t border-zinc-200/60 dark:border-white/10 w-full text-left">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
              Error Digest Code
            </span>
            <code className="text-xs bg-zinc-100 dark:bg-black/40 py-1.5 px-3 rounded-lg border border-zinc-200 dark:border-white/5 block text-zinc-600 dark:text-zinc-400 font-mono select-all overflow-x-auto whitespace-nowrap">
              {error.digest}
            </code>
          </div>
        )}
      </motion.div>
    </div>
  );
}
