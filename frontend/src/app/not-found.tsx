"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Compass,
  Home,
  LayoutDashboard,
  Users,
} from "lucide-react";

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();

  const quickLinks = [
    {
      title: "Main Dashboard",
      description: "Overview of your academic portal and notifications",
      href: "/dashboard",
      icon: LayoutDashboard,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
    },
    {
      title: "Course Catalog",
      description: "Browse registered subjects and syllabus details",
      href: "/dashboard/courses",
      icon: BookOpen,
      color: "text-indigo-500 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10 dark:bg-indigo-500/20",
    },
    {
      title: "Faculty Directory",
      description: "Find professors, departments, and office hours",
      href: "/dashboard/faculty",
      icon: Users,
      color: "text-emerald-500 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
    },
    {
      title: "Attendance & Schedule",
      description: "Check roll-call logs and weekly class timetables",
      href: "/dashboard/attendance",
      icon: Calendar,
      color: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-zinc-50 dark:bg-[#0b0914] text-zinc-900 dark:text-zinc-100 transition-colors relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group transition-transform hover:opacity-90"
        >
          <div className="w-10 h-10 shrink-0 overflow-hidden relative">
            <Image
              src="/collegelogo.png"
              alt="Nova Technology logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none tracking-tight">
              Nova Technology
            </span>
            <span className="text-md text-zinc-500 dark:text-zinc-400">
              ERP Portal
            </span>
          </div>
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all shadow-sm"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full flex flex-col items-center text-center"
        >

          {/* Large Hero 404 Display */}
          <h1 className="text-7xl sm:text-9xl font-black tracking-tight bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent mb-4 select-none">
            404
          </h1>

          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            Oops! Destination Uncharted
          </h2>

          {/* Description */}
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-lg mb-6 leading-relaxed">
            The page you are looking for doesn&apos;t exist or might have been moved.
            Double-check the web address or navigate using the shortcuts below.
          </p>

          {/* Current Requested Path Display */}
          {pathname && (
            <div className="mb-8 px-4 py-2 rounded-xl bg-zinc-200/60 dark:bg-white/5 border border-zinc-300/60 dark:border-white/10 text-xs font-mono text-zinc-600 dark:text-zinc-400 flex items-center gap-2 max-w-md overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="text-zinc-400 dark:text-zinc-500 font-sans">URL:</span>
              <code className="text-brand-primary dark:text-blue-400 truncate">{pathname}</code>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center mb-14">
            <button
              onClick={() => router.back()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-98 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/25 cursor-pointer active:scale-98"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
          </div>

          {/* Smart Navigation Hub */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            className="w-full text-left"
          >
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-brand-primary" />
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Quick Portal Navigation
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickLinks.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group p-4 rounded-2xl bg-white dark:bg-[#131022]/70 border border-zinc-200/80 dark:border-white/10 hover:border-brand-primary/50 dark:hover:border-brand-primary/50 transition-all duration-200 shadow-sm hover:shadow-md flex items-start gap-3.5"
                  >
                    <div className={`p-2.5 rounded-xl ${item.bgColor} ${item.color} transition-transform group-hover:scale-105`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-brand-primary dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                        {item.title}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        {item.description}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-zinc-400 dark:text-zinc-600 z-10">
        &copy; {new Date().getFullYear()} Nova Technology. All rights reserved.
      </footer>
    </div>
  );
}
