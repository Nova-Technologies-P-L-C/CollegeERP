"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/sidebar-config";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  navItems: NavItem[];
  roleLabel: string;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ navItems, roleLabel, isMobileOpen, onMobileClose, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 flex h-screen flex-col border-r-2 border-border bg-card transition-all duration-300 ease-in-out",
          collapsed ? "w-18" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="h-11 w-11 shrink-0 overflow-hidden">
            <Image
              src="/collegelogo.png"
              alt="Nova Technology logo"
              width={146}
              height={108}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-foreground truncate">Nova Tech ERP</span>
              <span className="text-[10px] font-medium text-muted-foreground truncate">{roleLabel}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (!active && onNavigate) {
                    onNavigate();
                  }
                }}
                className={cn(
                  "group flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-bold transition-all duration-200 border-2 border-transparent",
                  active
                    ? "bg-primary text-primary-foreground border-border shadow-[2px_2px_0px_0px_var(--border)] -translate-x-0.5 -translate-y-0.5"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border hover:shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.title}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={cn(
                        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-none border border-border px-1.5 text-[10px] font-black shadow-[1px_1px_0px_0px_var(--border)]",
                        active ? "bg-background text-foreground" : "bg-rose-600 text-white"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer controls */}
        <div className="border-t border-border p-3 space-y-2">
          <div className={cn("flex", collapsed ? "justify-center" : "justify-between items-center")}>
            {!collapsed && (
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Theme
              </span>
            )}
            <ThemeToggle />
          </div>

          {/* Collapse toggle (desktop) */}
          <div className="hidden lg:flex">
            <button
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-transparent px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border hover:shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
