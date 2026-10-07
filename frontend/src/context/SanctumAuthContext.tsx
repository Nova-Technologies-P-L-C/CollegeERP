"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

export interface SanctumUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "FACULTY" | "STUDENT";
  avatar?: string | null;
  student?: Record<string, unknown> | null;
  faculty?: Record<string, unknown> | null;
  admin?: { adminType?: string; [key: string]: unknown } | null;
  // Clerk compatibility fields
  fullName: string;
  firstName: string;
  lastName?: string;
  primaryEmailAddress: { emailAddress: string };
  publicMetadata: { role: string };
  imageUrl?: string;
  [key: string]: unknown;
}

interface SanctumAuthContextType {
  user: SanctumUser | null;
  token: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; password: string; role?: string; department?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const SanctumAuthContext = createContext<SanctumAuthContextType | undefined>(undefined);

function mapRawUser(u: Record<string, unknown>): SanctumUser {
  const email = (u.email as string) || "";
  const name = (u.name as string) || (email ? email.split("@")[0] : "User");
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || name;
  const lastName = nameParts.slice(1).join(" ") || "";
  const role = (((u.role as string) || "STUDENT").toUpperCase()) as "ADMIN" | "FACULTY" | "STUDENT";
  const adminObj = u.admin as { adminType?: string; [key: string]: unknown } | undefined;

  let effectiveRole = role.toLowerCase();
  if (role === "ADMIN" && adminObj?.adminType) {
    const aType = adminObj.adminType;
    if (aType === "PLATFORM_ADMIN") effectiveRole = "platform_admin";
    else if (aType === "ORG_ADMIN") effectiveRole = "org_admin";
    else if (aType === "REGISTRAR") effectiveRole = "registrar";
    else if (aType === "ACCOUNTANT") effectiveRole = "accountant";
    else effectiveRole = "admin";
  }

  return {
    ...u,
    id: (u.id as string) || "",
    email,
    name,
    role,
    avatar: (u.avatar as string) || null,
    student: (u.student as Record<string, unknown>) || null,
    faculty: (u.faculty as Record<string, unknown>) || null,
    admin: adminObj || null,
    fullName: name,
    firstName,
    lastName,
    primaryEmailAddress: { emailAddress: email },
    publicMetadata: { role: effectiveRole },
    imageUrl: (u.avatar as string) || undefined,
  };
}

export function SanctumAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SanctumUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoaded(true);
      return;
    }

    try {
      setToken(savedToken);
      const res = await api.get("/api/me");
      if (res.data && res.data.id) {
        setUser(mapRawUser(res.data));
      } else {
        setUser(null);
      }
    } catch {
      localStorage.removeItem("auth_token");
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      setUser(null);
      setToken(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post("/api/login", { email, password });
      const { token: receivedToken, user: rawUser } = res.data;

      localStorage.setItem("auth_token", receivedToken);
      // Set cookie for middleware/server components
      document.cookie = `auth_token=${receivedToken}; path=/; max-age=2592000; SameSite=Lax`;

      setToken(receivedToken);
      const mapped = mapRawUser(rawUser);
      setUser(mapped);
      return { success: true };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = axiosErr.response?.data?.error || axiosErr.response?.data?.message || "Invalid email or password";
      return { success: false, error: msg };
    }
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; password: string; role?: string; department?: string; phone?: string }) => {
      try {
        const res = await api.post("/api/register", data);
        const { token: receivedToken, user: rawUser } = res.data;

        localStorage.setItem("auth_token", receivedToken);
        document.cookie = `auth_token=${receivedToken}; path=/; max-age=2592000; SameSite=Lax`;

        setToken(receivedToken);
        const mapped = mapRawUser(rawUser);
        setUser(mapped);
        return { success: true };
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
        const msg = axiosErr.response?.data?.error || axiosErr.response?.data?.message || "Registration failed";
        return { success: false, error: msg };
      }
    },
    []
  );

  const resetPassword = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post("/api/reset-password", { email, password });
      const { token: receivedToken, user: rawUser } = res.data;

      if (receivedToken) {
        localStorage.setItem("auth_token", receivedToken);
        document.cookie = `auth_token=${receivedToken}; path=/; max-age=2592000; SameSite=Lax`;
        setToken(receivedToken);
      }
      if (rawUser) {
        setUser(mapRawUser(rawUser));
      }
      return { success: true };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = axiosErr.response?.data?.error || axiosErr.response?.data?.message || "Password reset failed";
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/logout");
    } catch {
      // Continue client cleanup even if network request fails
    }
    localStorage.removeItem("auth_token");
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setUser(null);
    setToken(null);
    router.push("/sign-in");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoaded,
      isSignedIn: !!user,
      login,
      register,
      resetPassword,
      logout,
      refreshUser: fetchProfile,
    }),
    [user, token, isLoaded, login, register, resetPassword, logout, fetchProfile]
  );

  return <SanctumAuthContext.Provider value={value}>{children}</SanctumAuthContext.Provider>;
}

export function useSanctumAuth() {
  const ctx = useContext(SanctumAuthContext);
  if (!ctx) {
    throw new Error("useSanctumAuth must be used within a SanctumAuthProvider");
  }
  return ctx;
}

// Drop-in Clerk compatibility hooks & components
export function useUser() {
  const { user, isLoaded, isSignedIn } = useSanctumAuth();
  return { user, isLoaded, isSignedIn };
}

export function useAuth() {
  const { user, isLoaded, isSignedIn, logout, token } = useSanctumAuth();
  return {
    userId: user?.id || null,
    isLoaded,
    isSignedIn,
    signOut: logout,
    getToken: async () => token,
  };
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useSanctumAuth();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useSanctumAuth();
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}

export function UserButton({
  afterSignOutUrl = "/sign-in",
}: {
  afterSignOutUrl?: string;
  appearance?: Record<string, unknown>;
}) {
  const { user, logout } = useSanctumAuth();
  const router = useRouter();

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {user.role}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={async () => {
            await logout();
            if (afterSignOutUrl) router.push(afterSignOutUrl);
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ClerkProvider({ children }: { children: React.ReactNode; [key: string]: unknown }) {
  return <SanctumAuthProvider>{children}</SanctumAuthProvider>;
}
