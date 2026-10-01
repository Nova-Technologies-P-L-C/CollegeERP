"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import { useTheme } from "next-themes";
import {
  User,
  Shield,
  Palette,
  QrCode,
  Check,
  Moon,
  Sun,
  Monitor,
  Lock,
  ExternalLink,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfileQRCode } from "@/components/dashboard/ProfileQRCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "FACULTY" | "STUDENT";

interface SettingsUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  avatar: string | null;
  student: { phone: string | null; department: string; rollNo: string } | null;
  faculty: { phone: string | null; department: string } | null;
}

interface Props {
  user: SettingsUser;
}

const roleBadgeClass: Record<Role, string> = {
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FACULTY:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  STUDENT:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type SectionId =
  | "profile"
  | "appearance"
  | "security"
  | "qr"
  | "admin-settings";

function ProfileSection({
  user,
  avatar,
  setAvatar,
}: {
  user: SettingsUser;
  avatar: string;
  setAvatar: (val: string) => void;
}) {
  const phone = user.student?.phone ?? user.faculty?.phone ?? "";
  const department =
    user.student?.department ?? user.faculty?.department ?? "—";
  const identifier = user.student?.rollNo ?? "—";

  const [name, setName] = useState(user.name ?? "");
  const [phoneVal, setPhoneVal] = useState(phone);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarUploading(true);

    const compressImage = (fileToCompress: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(fileToCompress);
        img.onload = () => {
          const maxDim = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to create canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      });
    };

    try {
      const base64String = await compressImage(file);
      await api.patch("/api/me", { avatar: base64String });
      setAvatar(base64String);
      window.dispatchEvent(new Event("profile-avatar-updated"));
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      setAvatarError("Failed to upload profile picture. Please try another image.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/api/me", { name, phone: phoneVal });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail — user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          Profile Information
        </h3>
        <p className="text-sm text-muted-foreground">
          Update your display name and contact details
        </p>
      </div>

      {avatarError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
          {avatarError}
        </div>
      )}

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted/20 border border-border">
        <div className="relative shrink-0 cursor-pointer group" onClick={() => !avatarUploading && document.getElementById("settings-avatar-input")?.click()}>
          <input
            type="file"
            id="settings-avatar-input"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={avatarUploading}
          />
          {avatarUploading ? (
            <div className="h-20 w-20 rounded-full border-2 border-brand-primary/40 bg-muted flex flex-col items-center justify-center gap-1 shadow-md">
              <div className="h-6 w-6 animate-spin border-2 border-brand-primary border-t-transparent rounded-full" />
              <span className="text-[9px] font-bold text-brand-primary">Uploading...</span>
            </div>
          ) : avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={avatar}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover border border-border shadow-lg group-hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-brand-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:opacity-90 transition-opacity">
              {getInitials(name)}
            </div>
          )}
          <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-brand-primary border-2 border-card flex items-center justify-center shadow-md">
            <Plus className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div>
          <p className="font-bold text-foreground text-lg">{name || "—"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={roleBadgeClass[user.role]}>
              {user.role}
            </Badge>
            {identifier !== "—" && (
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {identifier}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="settings-name"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Full Name
          </Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl"
            placeholder="Enter your full name"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="settings-phone"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Phone Number
          </Label>
          <Input
            id="settings-phone"
            value={phoneVal}
            onChange={(e) => setPhoneVal(e.target.value)}
            className="h-11 rounded-xl"
            placeholder="+251 912 345678"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Email Address
          </Label>
          <div className="relative">
            <Input
              value={user.email}
              disabled
              className="h-11 rounded-xl bg-muted/50 text-muted-foreground pr-24"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              Clerk managed
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Department
          </Label>
          <Input
            value={department}
            disabled
            className="h-11 rounded-xl bg-muted/50 text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          id="settings-save-profile"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "h-11 px-8 rounded-xl gap-2 transition-all duration-200",
            saved
              ? "bg-emerald-600 text-white hover:bg-emerald-600"
              : "bg-brand-primary text-white hover:opacity-90",
          )}
        >
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin border-2 border-white/40 border-t-white rounded-full" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

// Notifications tab removed

// ─── Appearance Section ───────────────────────────────────────────────────────
function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          Visual Interface
        </h3>
        <p className="text-sm text-muted-foreground">
          Customise how the portal looks for you
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Theme
        </p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer",
                theme === t.id
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-border bg-card hover:border-brand-primary/30 hover:bg-muted/30",
              )}
            >
              <t.icon
                className={cn(
                  "h-6 w-6",
                  theme === t.id
                    ? "text-brand-primary"
                    : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs font-semibold",
                  theme === t.id
                    ? "text-brand-primary"
                    : "text-muted-foreground",
                )}
              >
                {t.label}
              </span>
              {theme === t.id && (
                <div className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Security Section ─────────────────────────────────────────────────────────
function SecuritySection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          Security & Privacy
        </h3>
        <p className="text-sm text-muted-foreground">
          Authentication is managed securely via Clerk
        </p>
      </div>

      <div className="space-y-4">
        {/* Password */}
        <div className="p-5 rounded-2xl border border-border bg-card flex items-center justify-between">
          <div className="flex gap-3">
            <div className="p-2.5 border border-border bg-muted/30 rounded-xl shrink-0">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Password & Authentication
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Change password, enable 2FA, and manage login methods
              </p>
            </div>
          </div>
          <a
            href="https://accounts.clerk.dev/user"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button
              variant="outline"
              className="rounded-xl h-9 gap-1.5 text-xs"
            >
              Manage <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        </div>

        {/* Info box */}
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            <strong>Why Clerk?</strong> Your authentication credentials are
            stored and managed by Clerk, a secure identity provider. This
            ensures industry-standard password hashing, MFA, and session
            management without storing sensitive data in our database.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── QR Section ───────────────────────────────────────────────────────────────
function QRSection({ user }: { user: SettingsUser }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          Verification QR Code
        </h3>
        <p className="text-sm text-muted-foreground">
          Share this QR code for instant identity verification — no login
          required for the scanner.
        </p>
      </div>
      <ProfileQRCode userId={user.id} userName={user.name ?? user.email} />
    </div>
  );
}

// ─── Admin Settings Section ───────────────────────────────────────────────────
function AdminSettingsSection() {
  const [secret, setSecret] = useState("");
  const [expiryHoursInput, setExpiryHoursInput] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("");
      return;
    }

    const interval = setInterval(() => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setSecret("");
        setExpiresAt(null);
        setTimeLeft("");
        clearInterval(interval);
      } else {
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const hoursStr = String(hours).padStart(2, "0");
        const minsStr = String(mins).padStart(2, "0");
        const secsStr = String(secs).padStart(2, "0");
        setTimeLeft(`${hoursStr}:${minsStr}:${secsStr}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.post("/api/settings/admin-secret", {
        expiryHours: Number(expiryHoursInput) || 1,
      });
      setSecret(res.data.secret || "");
      if (res.data.expiresAt) {
        setExpiresAt(res.data.expiresAt);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setErrorMsg(axiosErr.response?.data?.error || "Failed to generate admin secret key.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSecret = async () => {
      try {
        const res = await api.get("/api/settings/admin-secret");
        if (res.data.secret) {
          setSecret(res.data.secret);
          if (res.data.expiresAt) {
            setExpiresAt(res.data.expiresAt);
          }
        }
      } catch (err) {
        console.error("Failed to fetch admin secret key:", err);
      }
    };
    fetchSecret();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          Admin Portal Settings
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure security credentials and onboarding secret keys
        </p>
      </div>

      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-secret-expiry" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Key Expiry Duration (Hours)
            </Label>
            <Input
              id="admin-secret-expiry"
              type="number"
              min="0.1"
              max="72"
              step="0.5"
              value={expiryHoursInput}
              onChange={(e) => setExpiryHoursInput(Number(e.target.value))}
              disabled={loading || !!timeLeft}
              className="h-11 rounded-xl font-mono"
              placeholder="e.g. 1"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-secret-key" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Admin Secret Key
            </Label>
            <div className="relative">
              <Input
                id="admin-secret-key"
                type="text"
                value={secret}
                readOnly
                className="h-11 rounded-xl pr-32 font-mono bg-muted/30"
                placeholder="No active secret key"
              />
              {timeLeft && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md animate-pulse">
                  Expires in {timeLeft}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          This secret key is required when a new user requests the ADMIN role during portal onboarding.
        </p>

        {errorMsg && (
          <p className="text-xs text-rose-500 font-semibold">{errorMsg}</p>
        )}

        <div className="flex items-center justify-between pt-2">
          {timeLeft ? (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Active key generated. Button is locked until key expires.
            </p>
          ) : (
            <span />
          )}
          <Button
            onClick={handleGenerate}
            disabled={loading || !!timeLeft}
            className={cn(
              "h-11 px-8 rounded-xl gap-2 transition-all duration-200 font-medium",
              saved
                ? "bg-emerald-600 text-white hover:bg-emerald-600 shadow-sm"
                : !!timeLeft
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 opacity-80 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-[0.98]",
            )}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin border-2 border-white/40 border-t-white rounded-full" />
                Generating…
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" /> Secret Key Generated!
              </>
            ) : timeLeft ? (
              "Key Active (Locked)"
            ) : (
              "Generate Secret Key"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function SettingsTabs({ user }: Props) {
  const [active, setActive] = useState<SectionId>("profile");
  const [prevAvatar, setPrevAvatar] = useState(user.avatar);
  const [avatar, setAvatar] = useState(user.avatar ?? "");

  if (user.avatar !== prevAvatar) {
    setPrevAvatar(user.avatar);
    setAvatar(user.avatar ?? "");
  }

  const navItems = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "security" as const, label: "Security", icon: Shield },
    ...(user.role === "STUDENT" || user.role === "FACULTY"
      ? [{ id: "qr" as const, label: "Verification QR", icon: QrCode }]
      : []),
    ...(user.role === "ADMIN" ? [{ id: "admin-settings" as const, label: "Admin Settings", icon: Lock }] : []),
  ];

  const contentMap: Record<SectionId, React.ReactNode> = {
    profile: <ProfileSection user={user} avatar={avatar} setAvatar={setAvatar} />,
    appearance: <AppearanceSection />,
    security: <SecuritySection />,
    qr: <QRSection user={user} />,
    "admin-settings": <AdminSettingsSection />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, preferences, and security"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* ── Left sidebar ── */}
        <aside className="w-full md:w-64 shrink-0 md:sticky md:top-6 space-y-2">
          {/* Avatar card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm text-center mb-4">
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatar}
                alt="Avatar"
                className="h-20 w-20 mx-auto rounded-full object-cover border border-border shadow-md mb-3"
              />
            ) : (
              <div className="h-20 w-20 mx-auto rounded-full bg-brand-primary flex items-center justify-center text-white text-2xl font-bold shadow-md mb-3">
                {getInitials(user.name)}
              </div>
            )}
            <p className="font-bold text-foreground truncate">
              {user.name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground truncate mb-2">
              {user.email}
            </p>
            <Badge variant="secondary" className={roleBadgeClass[user.role]}>
              {user.role}
            </Badge>
          </div>

          {/* Nav */}
          <nav className="rounded-2xl border border-border bg-card p-2 shadow-sm space-y-0.5">
            {navItems.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer text-left",
                    isActive
                      ? "bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground border-l-2 border-transparent",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Right content ── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                {contentMap[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
