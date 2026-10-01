"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { getNavItems } from "@/lib/sidebar-config";
import type { UserRole } from "@/types";
import { api } from "@/lib/axios";
import { useAuth } from "@clerk/nextjs";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
  roleLabel: string;
}

export function DashboardShell({ children, role, roleLabel }: DashboardShellProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevRole, setPrevRole] = useState(role);
  const [navItems, setNavItems] = useState(() => getNavItems(role));
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (role !== prevRole) {
    setPrevRole(role);
    setNavItems(getNavItems(role));
  }

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsNavigating(false);
  }

  useEffect(() => {
    if (pathname === "/dashboard/feedback") {
      localStorage.setItem("lastViewedFeedback", Date.now().toString());
    }
  }, [pathname]);

  useEffect(() => {
    if (role !== "student" || !isLoaded || !isSignedIn) return;
    let isMounted = true;

    api.get<{ student?: { status?: string } }>("/api/me")
      .then((res) => {
        if (!isMounted) return;
        const studentStatus = res.data?.student?.status;
        if (studentStatus === "Graduated" || studentStatus === "HSSC Completed") {
          setNavItems([
            { title: "Graduation Portal", href: "/dashboard/graduated", icon: LayoutDashboard },
            { title: "Alumni Directory", href: "/dashboard/alumni", icon: LayoutDashboard },
          ]);
          if (pathname !== "/dashboard/graduated" && !pathname.startsWith("/dashboard/alumni")) {
            window.location.href = "/dashboard/graduated";
          }
        }
      })
      .catch((err) => console.error("Failed to fetch student status for sidebar:", err));

    return () => {
      isMounted = false;
    };
  }, [role, isLoaded, isSignedIn, pathname]);

  useEffect(() => {
    if (role !== "admin" || !isLoaded || !isSignedIn) return;

    let isMounted = true;

    const fetchPendingCounts = async () => {
      try {
        const [admissionsRes, onboardingRes, feedbackRes] = await Promise.allSettled([
          api.get<unknown[]>("/api/admissions?status=Pending&limit=100"),
          api.get<unknown[]>("/api/onboarding?status=Pending"),
          api.get<{ date: string }[]>("/api/feedback"),
        ]);

        if (!isMounted) return;

        const admissionsData =
          admissionsRes.status === "fulfilled" && Array.isArray(admissionsRes.value.data)
            ? admissionsRes.value.data
            : [];
        const onboardingData =
          onboardingRes.status === "fulfilled" && Array.isArray(onboardingRes.value.data)
            ? onboardingRes.value.data
            : [];
        const feedbackData =
          feedbackRes.status === "fulfilled" && Array.isArray(feedbackRes.value.data)
            ? feedbackRes.value.data
            : [];

        const admissionsCount = admissionsData.length;
        const onboardingCount = onboardingData.length;
        const totalAdmissionsCount = admissionsCount + onboardingCount;
        
        let feedbackCount = 0;
        if (feedbackData.length > 0 && pathname !== "/dashboard/feedback") {
          const lastViewed = localStorage.getItem("lastViewedFeedback");
          const lastViewedTime = lastViewed ? parseInt(lastViewed) : 0;
          feedbackCount = feedbackData.filter(
            (f) => new Date(f.date).getTime() > lastViewedTime
          ).length;
        }

        setNavItems((prev) =>
          prev.map((item) => {
            if (item.title === "Admissions") {
              return { ...item, badge: totalAdmissionsCount > 0 ? totalAdmissionsCount : undefined };
            }
            if (item.title === "Feedback") {
              return { ...item, badge: feedbackCount > 0 ? feedbackCount : undefined };
            }
            return item;
          })
        );
      } catch (err) {
        console.error("Failed to fetch pending counts:", err);
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000); // Check every 30s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role, pathname, isLoaded, isSignedIn]);


  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isNavigating && (
        <>
          <style>{`
            @keyframes routeProgress {
              0% { width: 0%; }
              50% { width: 70%; }
              100% { width: 90%; }
            }
            .animate-route-progress {
              animation: routeProgress 2.5s ease-out forwards;
            }
          `}</style>
          <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-muted/20">
            <div className="h-full bg-brand-primary animate-route-progress shadow-[0_0_8px_var(--color-brand-primary)]" />
          </div>
        </>
      )}
      <Sidebar
        navItems={navItems}
        roleLabel={roleLabel}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onNavigate={() => setIsNavigating(true)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          onMenuClick={() => setMobileOpen(!mobileOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col justify-between">
          <div className="flex-1">
            {children}
          </div>

          {/* Dashboard Footer */}
          <footer className="mt-10 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground font-medium">
            <span>&copy; {new Date().getFullYear()} Nova Technology. All rights reserved.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
