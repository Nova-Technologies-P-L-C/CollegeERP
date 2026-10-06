"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui";
import type { Branch } from "@/types";

export default function PlatformAdminPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get<Branch[]>("/api/branches");
      setBranches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load branches for platform admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const pendingBranches = useMemo(() => {
    return branches.filter((b) => b.status === "PENDING_APPROVAL");
  }, [branches]);

  const activeBranches = useMemo(() => {
    return branches.filter((b) => b.status === "APPROVED");
  }, [branches]);

  const handleApprove = async (id: string, name: string) => {
    setActionLoading(id);
    setSuccessMsg("");
    try {
      await api.post(`/api/branches/${id}/approve`);
      setSuccessMsg(`Approved license for "${name}". The branch admin can now access all ERP capabilities.`);
      await loadBranches();
    } catch (err) {
      console.error("Failed to approve branch:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setActionLoading(id);
    setSuccessMsg("");
    try {
      await api.post(`/api/branches/${id}/reject`);
      setSuccessMsg(`Rejected license request for "${name}".`);
      await loadBranches();
    } catch (err) {
      console.error("Failed to reject branch:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Quick simulation helper for demo testing
  const handleSimulateNewClient = async () => {
    setActionLoading("simulate");
    try {
      const codeNum = Math.floor(100 + Math.random() * 900);
      await api.post("/api/branches", {
        name: `Horizon University College (Campus ${codeNum})`,
        code: `CAMPUS-H${codeNum}`,
        city: "Bahir Dar",
        address: "Lake View Academic Avenue",
        phone: "+251 58 220 1122",
        email: `admissions@horizon-${codeNum}.edu.et`,
        status: "PENDING_APPROVAL",
        isHead: true,
      });
      setSuccessMsg("Simulated new ERP purchase application from Horizon University College!");
      await loadBranches();
    } catch (err) {
      console.error("Failed to simulate client:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAllBranches = useMemo(() => {
    return branches.filter((b) => {
      const q = searchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q))
      );
    });
  }, [branches, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Platform Administration & Licensing (Nova Technology)"
        subtitle="Super-administrative portal for Nova Technology ('we'). Review institutional ERP purchase orders and approve client branch licenses."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Platform Admin" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulateNewClient}
              disabled={actionLoading === "simulate"}
              className="gap-2 text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5 text-brand-primary" />
              Simulate Client Purchase
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBranches}
              disabled={loading}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* SUCCESS NOTIFICATION */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMsg("")}
            className="h-6 px-2 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* 1. PLATFORM MACRO METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Pending Approvals
              </span>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                {pendingBranches.length}
              </div>
              <p className="text-xs text-muted-foreground">Colleges awaiting activation</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Licensed Campuses
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {activeBranches.length}
              </div>
              <p className="text-xs text-muted-foreground">Active client installations</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Total ERP Campuses
              </span>
              <div className="text-3xl font-black text-foreground">
                {branches.length}
              </div>
              <p className="text-xs text-muted-foreground">Registered on platform</p>
            </div>
            <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Client Sub-Branches
              </span>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                {branches.filter((b) => b.parentId !== null).length}
              </div>
              <p className="text-xs text-muted-foreground">Spawned auxiliary campuses</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <GitBranch className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. PENDING CLIENT APPROVALS (ACTIONABLE) */}
      <Card className="border-amber-300/40 bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Pending Client Approval Requests ({pendingBranches.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  New colleges and branches that purchased the Nova Tech ERP license awaiting Platform Admin activation.
                </CardDescription>
              </div>
            </div>
            {pendingBranches.length > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 font-bold text-xs animate-pulse">
                Action Required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={3} />
            </div>
          ) : pendingBranches.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-foreground">All client branches are approved & up to date!</p>
              <p className="mt-0.5">Use &quot;Simulate Client Purchase&quot; above to create a test onboarding request.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-[11px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Campus Code</th>
                    <th className="p-3.5">Institution / Campus</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Contact Email</th>
                    <th className="p-3.5">Purchase Status</th>
                    <th className="p-3.5 text-right">Vendor Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingBranches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-brand-primary">{branch.code}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{branch.name}</div>
                        <div className="text-[11px] text-muted-foreground">{branch.address || "Main Campus"}</div>
                      </td>
                      <td className="p-3.5 text-foreground">{branch.city || "Ethiopia"}</td>
                      <td className="p-3.5 font-mono text-muted-foreground">{branch.email || "N/A"}</td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 text-[10px] font-bold">
                          Pending Approval
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(branch.id, branch.name)}
                          disabled={actionLoading === branch.id}
                          className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(branch.id, branch.name)}
                          disabled={actionLoading === branch.id}
                          className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve License
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. ALL CLIENT CAMPUSES MASTER DIRECTORY */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                All Client Institutions & Campuses
              </CardTitle>
              <CardDescription className="text-xs">
                Master database of active institutions, authorized head campuses, and spawned sub-branches.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter campuses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[11px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="p-3.5">Campus Code</th>
                  <th className="p-3.5">Campus / Institution Name</th>
                  <th className="p-3.5">Hierarchy Tier</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">License Status</th>
                  <th className="p-3.5">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAllBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-foreground">{branch.code}</td>
                    <td className="p-3.5 font-semibold text-foreground">
                      <div>{branch.name}</div>
                      {branch.email && <div className="text-[11px] text-muted-foreground">{branch.email}</div>}
                    </td>
                    <td className="p-3.5">
                      {branch.isHead ? (
                        <Badge className="bg-brand-primary text-white text-[10px] font-bold">
                          Head Campus (Client A)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300 text-[10px] font-medium">
                          Sub-Branch ({branch.parent?.code || "A"})
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-muted-foreground">{branch.city || "Ethiopia"}</td>
                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className={
                          branch.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px] font-bold"
                            : branch.status === "PENDING_APPROVAL"
                            ? "bg-amber-500/10 text-amber-700 border-amber-300 text-[10px] font-bold"
                            : "bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-bold"
                        }
                      >
                        {branch.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                      {branch.approvedBy || "Awaiting Approval"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
