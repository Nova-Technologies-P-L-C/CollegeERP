"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import { AlumniDashboardHome } from "@/components/dashboard/AlumniDashboardHome";
import { ListSkeleton } from "@/components/ui";
import { useUser } from "@/context/SanctumAuthContext";

interface StudentDashboardResponse {
  studentProfile?: {
    id: string;
    rollNo: string;
    department: string;
    cgpa?: number;
    gradesheetUrl?: string | null;
    graduationDate?: string | null;
    enrollmentDate?: string;
    status?: string;
  };
}

export default function GraduatedDashboardPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentDashboardResponse["studentProfile"] | null>(null);
  const [dbName, setDbName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.get<StudentDashboardResponse>("/api/dashboard/student").catch(() => null),
      api.get<{ name?: string }>("/api/me").catch(() => null),
    ]).then(([dashRes, meRes]) => {
      if (!isMounted) return;
      if (dashRes?.data?.studentProfile) {
        setProfile(dashRes.data.studentProfile);
      }
      if (meRes?.data?.name) {
        setDbName(meRes.data.name);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
        <ListSkeleton count={4} />
      </div>
    );
  }

  const displayName = dbName || user?.fullName || user?.firstName || "Graduated Student";

  return (
    <AlumniDashboardHome
      studentName={displayName}
      department={profile?.department || "Computer Science"}
      cgpa={profile?.cgpa ?? 3.8}
      rollNo={profile?.rollNo || "N/A"}
      gradesheetUrl={profile?.gradesheetUrl}
      graduationDate={profile?.graduationDate}
      enrollmentDate={profile?.enrollmentDate}
    />
  );
}
