"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error securely
    console.error("Application runtime error:", error);
  }, [error]);

  const isDbError =
    error?.message?.includes("database") ||
    error?.message?.includes("Prisma") ||
    error?.message?.includes("connect") ||
    error?.message?.includes("ECONNREFUSED") ||
    error?.message?.includes("unavailable");

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden font-sans">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 md:p-10 shadow-2xl text-center flex flex-col items-center">
        {/* Animated Icon Container */}
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400 mb-6 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-400 via-indigo-300 to-indigo-400 bg-clip-text text-transparent mb-3 font-outfit">
          {isDbError ? "Database Connection Offline" : "Something Went Wrong"}
        </h1>

        {/* Description */}
        <p className="text-sm md:text-base text-slate-400 max-w-md mb-8 leading-relaxed">
          {isDbError
            ? "We are currently experiencing database technical difficulties. Your profile is safe, and we are working on resolving this as quickly as possible."
            : "An unexpected exception has occurred in the application. Please try resetting the page or contact system administrators."}
        </p>

        {/* Actions */}
        <div className="w-full flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 cursor-pointer active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 cursor-pointer active:scale-98"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Footer info code */}
        {error.digest && (
          <div className="mt-8 pt-6 border-t border-slate-800/40 w-full text-left">
            <span className="text-[10px] tracking-wider text-slate-500 block uppercase mb-1">
              Error Diagnostic Token
            </span>
            <code className="text-xs bg-slate-950/80 py-1.5 px-3 rounded-lg border border-slate-800/60 block text-slate-400 select-all overflow-x-auto whitespace-nowrap scrollbar-thin">
              {error.digest}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
