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
  UserX,
  RefreshCw,
  BookOpen,
  Calendar,
  UserCheck,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { useProgramLevel } from "@/context/program-level-context";
import { getDisciplinesForLevel, formatTermLabel } from "@/lib/constants";

interface LeftStudentRecord {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  avatar: string | null;
  department: string;
  discipline?: string | null;
  semester: number;
  part?: number | null;
  shift: string;
  status: string;
  leftReason: string;
  leftDate: string;
  readmitRequested: boolean;
}

export default function LeftStudentsPage() {
  const { programLevel } = useProgramLevel();
  const [students, setStudents] = useState<LeftStudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [readmittingId, setReadmittingId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDept("all");
  }, [programLevel]);

  const fetchLeftStudents = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/students/left";
      const params = new URLSearchParams();
      params.append("programLevel", programLevel);
      if (selectedDept !== "all") params.append("department", selectedDept);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      if (params.toString()) url += `?${params.toString()}`;

      const { data } = await api.get<LeftStudentRecord[]>(url);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch left students:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDept, searchQuery, programLevel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeftStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLeftStudents]);

  const handleReadmit = async (studentId: string) => {
    setReadmittingId(studentId);
    try {
      await api.patch("/api/students/left", {
        studentId,
        action: "readmit",
      });
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err) {
      console.error("Failed to readmit student:", err);
    } finally {
      setReadmittingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title={programLevel === "INTERMEDIATE" ? "Dropped Intermediate Students" : "Dropped BS Students"}
        subtitle="Manage students who dropped out from their academic journey midway and process readmission requests."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Dropped Students" },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeftStudents}
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
            placeholder="Search by name, roll no, or email..."
            className="pl-9 h-10 rounded-xl bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
          <Badge
            onClick={() => setSelectedDept("all")}
            variant={selectedDept === "all" ? "default" : "outline"}
            className={`cursor-pointer px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              selectedDept === "all"
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
              className={`cursor-pointer px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedDept === dept
                  ? "bg-brand-primary text-white"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              {dept}
            </Badge>
          ))}
        </div>
      </div>

      {/* Dropped Students Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse border border-border" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-2xl space-y-3">
          <UserX className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-bold text-foreground">No Dropped Students Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            There are currently no students recorded as dropped midway for this level.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {students.map((person) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group relative border border-border bg-card hover:border-rose-500/50 hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden flex flex-col justify-between h-full">
                  <div className="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />
                  <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0 font-extrabold text-sm flex items-center justify-center">
                        {person.avatar ? (
                          <Image src={person.avatar} alt={person.name} fill className="object-cover" />
                        ) : (
                          person.name.substring(0, 2).toUpperCase()
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

                    <div className="space-y-1.5 text-[11px] text-muted-foreground font-medium pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 truncate">
                          <BookOpen className="h-3 w-3 text-rose-500 shrink-0" />
                          <span className="truncate">{person.department}</span>
                        </span>
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-bold">
                          {formatTermLabel(programLevel, person.semester)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 text-[11px]">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-semibold">{person.leftReason}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(person.leftDate).toLocaleDateString()}
                        </span>
                        <Badge variant="destructive" className="text-[9px] uppercase font-black">
                          {person.status}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleReadmit(person.id)}
                      disabled={readmittingId === person.id}
                      size="sm"
                      className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {readmittingId === person.id ? "Readmitting..." : "Readmit Student"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
