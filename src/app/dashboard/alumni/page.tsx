"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { api } from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Users,
  RefreshCw,
  BookOpen,
  Calendar,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { useProgramLevel } from "@/context/program-level-context";
import { getDisciplinesForLevel } from "@/lib/constants";

interface AlumniRecord {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  avatar: string | null;
  department: string;
  graduationYear: number;
  batch?: string;
  cgpa: number;
  shift: string;
  status: string;
}

export default function AlumniDirectoryPage() {
  const { programLevel } = useProgramLevel();
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDept("all");
  }, [programLevel]);

  useEffect(() => {
    api.get("/api/me")
      .then((res) => {
        if (res.data?.role) {
          setUserRole(String(res.data.role).toLowerCase());
        }
      })
      .catch(() => setUserRole("student"));
  }, []);

  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/alumni";
      const params = new URLSearchParams();
      params.append("programLevel", programLevel);
      if (selectedDept !== "all") params.append("department", selectedDept);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      if (params.toString()) url += `?${params.toString()}`;

      const { data } = await api.get<AlumniRecord[]>(url);
      setAlumni(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch alumni directory:", err);
      setAlumni([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDept, searchQuery, programLevel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlumni();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAlumni]);

  const isAdmin = userRole === "admin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title={programLevel === "INTERMEDIATE" ? "HSSC Completed Directory" : "Alumni Directory"}
        subtitle={programLevel === "INTERMEDIATE" ? "Connect with HSSC Completed students." : "Connect with graduated BS students."}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: programLevel === "INTERMEDIATE" ? "HSSC Completed Directory" : "Alumni Directory" },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlumni}
            className="flex items-center gap-2 border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAdmin ? "Search by name, roll no, or email..." : "Search by name..."}
            className="pl-9 h-10 rounded-xl bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
          <Badge
            onClick={() => setSelectedDept("all")}
            variant={selectedDept === "all" ? "default" : "outline"}
            className={`cursor-pointer px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${selectedDept === "all"
                ? "bg-brand-primary text-white"
                : "hover:bg-accent text-muted-foreground"
              }`}
          >
            {programLevel === "INTERMEDIATE" ? "All Disciplines" : "All Departments"}
          </Badge>
          {getDisciplinesForLevel(programLevel).map((dept) => (
            <Badge
              key={dept}
              onClick={() => setSelectedDept(dept)}
              variant={selectedDept === dept ? "default" : "outline"}
              className={`cursor-pointer px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${selectedDept === dept
                  ? "bg-brand-primary text-white"
                  : "hover:bg-accent text-muted-foreground"
                }`}
            >
              {dept}
            </Badge>
          ))}
        </div>
      </div>

      {/* Alumni Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse border border-border" />
          ))}
        </div>
      ) : alumni.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-2xl space-y-3">
          <Users className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-bold text-foreground">
            {programLevel === "INTERMEDIATE" ? "No HSSC Passed Students Found" : "No Alumni Found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {programLevel === "INTERMEDIATE"
              ? "No HSSC completed students match your search criteria. When Part 2 students are promoted to HSSC Completed status, they will automatically appear here."
              : "No graduated students match your search criteria. When 8th semester students are promoted, they will automatically appear in this directory."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {alumni.map((person) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {isAdmin ? (
                  /* Admin Detailed Card */
                  <Card className="group relative border border-border bg-card hover:border-brand-primary/50 hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-amber-500 via-brand-primary to-indigo-600" />
                    <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                          {person.avatar ? (
                            <Image
                              src={person.avatar}
                              alt={person.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                              {person.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {person.name}
                          </h4>
                          <p className="text-[11px] font-mono font-semibold text-brand-primary truncate">
                            {person.rollNo}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {person.email}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/50 font-medium">
                        <div className="flex items-center gap-1.5 truncate">
                          <BookOpen className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="truncate">{person.department}</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Calendar className="h-3 w-3 text-brand-primary shrink-0" />
                          <span>{person.batch || `Batch ${person.graduationYear - 4}-${String(person.graduationYear).slice(-2)}`}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-semibold">
                          {person.shift} Shift
                        </Badge>
                        {person.cgpa !== null && person.cgpa !== undefined && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            CGPA: {Number(person.cgpa).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Faculty & Student Sleek Compact Linear Card */
                  <Card className="group relative border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden">
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 font-extrabold text-xs flex items-center justify-center">
                            {person.avatar ? (
                              <Image src={person.avatar} alt={person.name} fill className="object-cover" />
                            ) : (
                              person.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {person.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold truncate">
                              <span className="truncate">{person.department}</span>
                              <span>•</span>
                              <span className="shrink-0 font-mono text-brand-primary font-bold">
                                {person.batch || `Batch ${person.graduationYear - 4}-${String(person.graduationYear).slice(-2)}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {person.cgpa !== null && person.cgpa !== undefined && (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] px-2.5 py-1 rounded-xl border border-emerald-500/20 shrink-0">
                            CGPA {Number(person.cgpa).toFixed(2)}
                          </Badge>
                        )}
                      </div>

                      {person.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono pt-2 border-t border-border/50">
                          <Mail className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <a
                            href={`mailto:${person.email}`}
                            title={`Send email to ${person.email}`}
                            className="hover:underline hover:text-brand-primary truncate text-[11px] font-semibold text-brand-primary"
                          >
                            {person.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
