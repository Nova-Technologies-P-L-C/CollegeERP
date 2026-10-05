"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  Building2,
  Shield,
  UserPlus,
  Receipt,
  GraduationCap,
  BookOpen,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const DEMO_ROLES = [
  {
    role: "org_admin",
    label: "Organizational Admin",
    description: "Executive oversight, macro-analytics & role explorer",
    href: "/dashboard/org-admin",
    icon: Building2,
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300",
  },
  {
    role: "branch_admin",
    label: "Branch Admin",
    description: "Operational campus management & master audit",
    href: "/dashboard",
    icon: Shield,
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300",
  },
  {
    role: "registrar",
    label: "Registrar Desk",
    description: "New student registration & admission slips",
    href: "/dashboard/registrar",
    icon: UserPlus,
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300",
  },
  {
    role: "accountant",
    label: "Accountant Desk",
    description: "Fee verification, receipts & Roll No activation",
    href: "/dashboard/accountant",
    icon: Receipt,
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300",
  },
  {
    role: "faculty",
    label: "Faculty Portal",
    description: "Roll-call attendance, gradebook & quizzes",
    href: "/dashboard/mark-attendance",
    icon: GraduationCap,
    badgeColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300",
  },
  {
    role: "student",
    label: "Student Portal",
    description: "Grades, attendance alerts & course timetable",
    href: "/dashboard/my-grades",
    icon: BookOpen,
    badgeColor: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300",
  },
];

export function DemoRoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const currentRole =
    DEMO_ROLES.find((r) => pathname === r.href || (r.href !== "/dashboard" && pathname.startsWith(r.href))) ||
    DEMO_ROLES[1]; // default branch admin

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 gap-2 border-brand-primary/40 bg-brand-primary/5 hover:bg-brand-primary/10 transition-all font-semibold text-xs shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-primary animate-pulse" />
            <span className="hidden sm:inline text-muted-foreground font-normal">Role Demo:</span>
            <span className="text-brand-primary font-bold">{currentRole.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-1.5 space-y-1">
          <DropdownMenuLabel className="text-xs font-bold text-muted-foreground flex items-center justify-between">
            <span>SWITCH DEMO ROLE</span>
            <Badge variant="outline" className="text-[10px] font-mono uppercase px-1.5 py-0">
              Interactive Test
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DEMO_ROLES.map((item) => {
            const Icon = item.icon;
            const isSelected = item.role === currentRole.role;
            return (
              <DropdownMenuItem
                key={item.role}
                onClick={() => router.push(item.href)}
                className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-accent"
              >
                <div className={`p-1.5 rounded-md border mt-0.5 ${item.badgeColor}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{item.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-brand-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
