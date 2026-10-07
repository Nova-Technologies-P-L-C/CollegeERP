"use client";

import { useRef } from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@/context/SanctumAuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SmoothScroll from "@/components/SmoothScroll";

gsap.registerPlugin(ScrollTrigger);

const operationsFlow = [
  {
    time: "08:10 AM",
    title: "Roll Call Window",
    owner: "Faculty",
    text: "Attendance is marked class-wise and late flags update instantly for first-period tracking.",
    icon: ClipboardCheck,
  },
  {
    time: "11:40 AM",
    title: "Assessment Block",
    owner: "Faculty + Students",
    text: "Question banks, quiz attempts, and grade entries stay synced across course sections.",
    icon: BookOpen,
  },
  {
    time: "01:30 PM",
    title: "Admissions Desk",
    owner: "Admin",
    text: "Application status changes, registration checks, and course allocation are handled from one queue.",
    icon: Users,
  },
  {
    time: "03:20 PM",
    title: "Finance + Alerts Review",
    owner: "Admin",
    text: "Dues summaries, pending fee notices, and attendance alerts are reviewed before day close.",
    icon: CreditCard,
  },
  {
    time: "05:00 PM",
    title: "Decision Snapshot",
    owner: "Principal Office",
    text: "Daily dashboard consolidates attendance trend, class progress, and critical notices.",
    icon: BarChart3,
  },
];

const commandStreams = [
  {
    title: "Academic Control",
    detail: "Course, attendance, timetable, and assessment operations in one rail.",
    bullets: ["Attendance Register", "Timetable Planning", "Assessments & Quiz Bank"],
    icon: GraduationCap,
  },
  {
    title: "Administrative Control",
    detail: "Admissions, dues, notices, and governance actions with role-safe access.",
    bullets: ["Admissions Pipeline", "Fees & Dues", "Role Security"],
    icon: Shield,
  },
  {
    title: "Insight Control",
    detail: "Institution-wide signals for intervention and policy decisions.",
    bullets: ["Progress Analytics", "Feedback Channel", "Daily Decision Snapshot"],
    icon: MessageSquare,
  },
];

const moduleRows = [
  {
    title: "Attendance Register",
    metric: "Live status",
    summary: "Mark present, absent, and late once. Percentages and warnings remain visible per student.",
    icon: ClipboardCheck,
  },
  {
    title: "Timetable Planning",
    metric: "Conflict checks",
    summary: "Teacher and room collisions are caught before publishing final weekly schedule.",
    icon: Calendar,
  },
  {
    title: "Assessments + Gradebook",
    metric: "Auto-scoring",
    summary: "Quiz attempts, score totals, and grade breakdowns stay aligned by course and section.",
    icon: BookOpen,
  },
  {
    title: "Admissions + Fees",
    metric: "Queue view",
    summary: "From applicant intake to dues visibility, admin can monitor each student lifecycle stage.",
    icon: Users,
  },
];

const rolePaths = [
  {
    title: "Students",
    summary: "Check grades, attendance, timetable, and dues from one personal dashboard.",
    points: ["Live attendance and grades", "Personal timetable", "Quiz participation", "Transparent dues status"],
  },
  {
    title: "Faculty",
    summary: "Manage classes efficiently with attendance, assessments, and academic insights.",
    points: ["Attendance workflow", "Question bank tools", "Performance snapshots", "Teaching schedule access"],
  },
  {
    title: "Admins",
    summary: "Oversee admissions, records, scheduling, and finance from one control center.",
    points: ["User and role management", "Timetable coordination", "Fee and dues control", "Institution-wide reporting"],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // 3D Staggered Hero Reveal
    const words = heroTextRef.current?.querySelectorAll("span") || [];
    gsap.from(words, {
      z: 500,
      opacity: 0,
      rotateX: -45,
      stagger: 0.1,
      duration: 1.5,
      ease: "power4.out",
    });

    // Perspective Grid Animation on Scroll
    gsap.to(gridRef.current, {
      backgroundPositionY: "200%",
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });

    // Floating Background Elements
    gsap.to(".floating-asset", {
      y: "random(-20, 20)",
      x: "random(-20, 20)",
      rotation: "random(-15, 15)",
      duration: "random(2, 4)",
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: {
        each: 0.5,
        from: "random",
      },
    });
    // Campus Flow Timeline Animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".campus-flow-container",
        start: "top 80%",
        end: "bottom 60%",
        scrub: 1,
      }
    });

    tl.fromTo(".campus-line", 
      { scaleY: 0 }, 
      { scaleY: 1, ease: "none", duration: 1 }
    );

    gsap.from(".campus-step", {
      opacity: 0,
      x: -30,
      stagger: 0.2,
      scrollTrigger: {
        trigger: ".campus-flow-container",
        start: "top 75%",
        toggleActions: "play none none reverse"
      }
    });
  }, { scope: containerRef });

  return (
    <SmoothScroll>
      <div ref={containerRef} className="min-h-screen bg-background text-foreground overflow-hidden">
      <Header />

      <main id="main-content" className="relative overflow-x-hidden">
        {/* Dotted Mesh Background */}
        <div className="pointer-events-none absolute inset-0 -z-20 dotted-bg opacity-15" />

        {/* Floating Background Assets */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <GraduationCap className="floating-asset absolute left-[10%] top-[20%] h-24 w-24 text-primary opacity-10" />
            <BookOpen className="floating-asset absolute right-[15%] top-[40%] h-20 w-20 text-brand-secondary opacity-10" />
            <Shield className="floating-asset absolute left-[20%] bottom-[15%] h-32 w-32 text-primary opacity-10" />
            <Sparkles className="floating-asset absolute right-[10%] bottom-[30%] h-16 w-16 text-brand-secondary opacity-15" />
        </div>

        <section id="overview" className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-36">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 dotted-bg opacity-10" />
            <div className="absolute bottom-8 left-1/3 h-52 w-52 rounded-none border border-dashed border-border/20" />
            <div className="absolute top-24 right-8 h-60 w-60 rounded-none border border-dashed border-border/20" />
          </div>

          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <motion.div
              initial={prefersReducedMotion ? false : "hidden"}
              animate={prefersReducedMotion ? undefined : "visible"}
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-none border-2 border-border bg-card px-4 py-2 text-xs font-bold tracking-wide text-primary shadow-[2px_2px_0px_0px_var(--border)] sm:text-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Nova Technology | Enterprise College ERP
              </div>

              <h1 
                ref={heroTextRef}
                className="mt-6 max-w-4xl text-4xl font-black leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              >
                <span className="inline-block">Not</span> <span className="inline-block">another</span> <span className="inline-block">template</span> <span className="inline-block">dashboard.</span>
                <span className="block text-primary mt-2">A daily operating system for your campus.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80 sm:text-lg">
                From first-period attendance to end-of-day reports, this portal is designed around real institutional routines, not generic startup landing copy.
              </p>

              <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <SignedOut>
                  <Button asChild size="lg">
                    <Link href="/sign-up">
                      Start Your Account
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#campus-flow">See Command Flow</Link>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button asChild size="lg">
                    <Link href="/dashboard">
                      Continue to Dashboard
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </SignedIn>
              </div>
            </motion.div>

            <div
              className="rounded-none border-2 border-border bg-card p-6 shadow-[4px_4px_0px_0px_var(--border)] select-none"
            >
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Command Snapshot</p>
              <div className="mt-4 space-y-4">
                {[
                  { label: "Departments", value: "Computer Science, Commerce, English" },
                  { label: "Today", value: "18 classes | 7 faculty sessions" },
                  { label: "Queue", value: "6 admission cases | 24 dues reminders" },
                  { label: "Status", value: "Attendance, assessments, and fee records synchronized" },
                ].map((row) => (
                  <div key={row.label} className="border-b-2 border-border/10 pb-3 last:border-b-0 last:pb-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{row.label}</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Platform proof points" className="px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_1.2fr_1fr]">
            <Card className="border-2 border-border bg-card text-card-foreground shadow-[3px_3px_0px_0px_var(--border)]">
              <CardContent className="p-6">
                <p className="text-4xl font-black text-primary">3</p>
                <p className="mt-2 text-sm font-bold text-muted-foreground uppercase tracking-wide">User roles with separate workflows</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border bg-foreground text-background shadow-[3px_3px_0px_0px_var(--border)]">
              <CardContent className="p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Operating Principle</p>
                <p className="mt-3 text-base font-semibold leading-relaxed">
                  One source of truth from classroom to office desk. No duplicate sheets, no delayed records, no disconnected decisions.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border bg-card text-card-foreground shadow-[3px_3px_0px_0px_var(--border)]">
              <CardContent className="p-6">
                <p className="text-4xl font-black text-primary">5</p>
                <p className="mt-2 text-sm font-bold text-muted-foreground uppercase tracking-wide">Daily operational checkpoints covered</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="campus-flow" className="bg-card border-y-2 border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={prefersReducedMotion ? false : "hidden"}
              whileInView={prefersReducedMotion ? undefined : "visible"}
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-10"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Daily command flow</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Your day, mapped as an operations timeline.
              </h2>
            </motion.div>

            <div className="campus-flow-container relative rounded-none border-2 border-border bg-background p-4 sm:p-6">
              <div className="campus-line absolute bottom-6 left-8 top-6 hidden w-0.5 bg-border md:block origin-top" />
              <div className="space-y-4">
                {operationsFlow.map((step) => {
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="campus-step"
                    >
                      <div className="grid gap-3 rounded-none border-2 border-border bg-card p-4 md:grid-cols-[auto_1fr] md:gap-5 md:p-5 shadow-[3px_3px_0px_0px_var(--border)]">
                        <div className="flex items-center gap-3 md:min-w-48 md:items-start md:gap-4">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-none border-2 border-border bg-primary text-primary-foreground shadow-[1px_1px_0px_0px_var(--border)]">
                            <StepIcon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{step.time}</p>
                            <h3 className="mt-1 text-sm font-black text-foreground sm:text-base">{step.title}</h3>
                            <p className="text-xs font-bold text-muted-foreground uppercase">{step.owner}</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground md:pt-1">{step.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <motion.div
              initial={prefersReducedMotion ? false : "hidden"}
              whileInView={prefersReducedMotion ? undefined : "visible"}
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="lg:sticky lg:top-28"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Command streams</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">One dashboard, three control rails.</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Each rail solves a different operational domain while sharing the same student, course, and schedule data.
              </p>

              <div className="mt-6 space-y-4">
                {commandStreams.map((stream) => {
                  const StreamIcon = stream.icon;
                  return (
                    <Card key={stream.title} className="border-2 border-border bg-card shadow-[3px_3px_0px_0px_var(--border)]">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2 border-border bg-primary text-primary-foreground shadow-[1px_1px_0px_0px_var(--border)]">
                            <StreamIcon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-black text-foreground">{stream.title}</p>
                            <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">{stream.detail}</p>
                            <p className="mt-2 text-xs font-bold text-primary uppercase tracking-wider">{stream.bullets.join(" | ")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>

            <div className="space-y-4">
              {moduleRows.map((module, index) => {
                const ModuleIcon = module.icon;
                return (
                  <motion.div
                    key={module.title}
                    initial={prefersReducedMotion ? false : "hidden"}
                    whileInView={prefersReducedMotion ? undefined : "visible"}
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeUp}
                    transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : index * 0.05 }}
                  >
                    <div className="h-full hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
                      <Card className="h-full border-2 border-border bg-card shadow-[3px_3px_0px_0px_var(--border)] hover:shadow-[4px_4px_0px_0px_var(--border)] transition-all">
                        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between h-full">
                          <div className="flex items-start gap-4">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-none border-2 border-border bg-primary text-primary-foreground shadow-[1px_1px_0px_0px_var(--border)]">
                              <ModuleIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div>
                              <CardTitle className="text-lg font-black text-foreground">{module.title}</CardTitle>
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.summary}</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center rounded-none border-2 border-border bg-accent text-accent-foreground px-2 py-1 text-xs font-bold uppercase tracking-wider shadow-[1px_1px_0px_0px_var(--border)]">
                            {module.metric}
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="roles" className="bg-card border-y-2 border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={prefersReducedMotion ? false : "hidden"}
              whileInView={prefersReducedMotion ? undefined : "visible"}
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-10"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Role paths</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Three interfaces, one data backbone.
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {rolePaths.map((role, index) => (
                <motion.div
                  key={role.title}
                  initial={prefersReducedMotion ? false : "hidden"}
                  whileInView={prefersReducedMotion ? undefined : "visible"}
                  viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp}
                  transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : index * 0.06 }}
                >
                  <Card className="h-full border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] text-card-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_var(--border)] transition-all">
                    <CardHeader>
                      <CardTitle className="text-2xl font-black text-foreground">{role.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">{role.summary}</p>
                      <ul className="mt-5 space-y-2">
                        {role.points.map((point) => (
                          <li key={point} className="flex items-start gap-2 text-sm font-semibold text-foreground">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="start" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-5xl rounded-none border-2 border-border bg-foreground text-background px-6 py-12 text-center shadow-[6px_6px_0px_0px_var(--border)] sm:px-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Get started</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl text-background">
              Move this semester to one control center.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-background/80 sm:text-base font-medium">
              If your teams are still switching between register books, spreadsheets, and chat threads, this portal gives students, faculty, and admin one operational truth.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <SignedOut>
                <Button asChild size="lg" className="bg-primary text-primary-foreground border-2 border-background shadow-[2px_2px_0px_0px_var(--background)] hover:shadow-[3px_3px_0px_0px_var(--background)]">
                  <Link href="/sign-up">
                    Create Account
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-background bg-transparent text-background hover:bg-background/10"
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button asChild size="lg" className="bg-primary text-primary-foreground border-2 border-background shadow-[2px_2px_0px_0px_var(--background)] hover:shadow-[3px_3px_0px_0px_var(--background)]">
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </SignedIn>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      </div>
    </SmoothScroll>
  );
}