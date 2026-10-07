"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui";
import type { Branch } from "@/types";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form state for creating a new sub-branch (e.g. Branch A creating A1, A2)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    city: "Addis Ababa",
    address: "",
    phone: "",
    email: "",
    parentId: "",
  });

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get<Branch[]>("/api/branches");
      setBranches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  // Identify head branch (Branch A)
  const headBranch = useMemo(() => {
    return branches.find((b) => b.isHead && b.status === "APPROVED") || branches[0];
  }, [branches]);

  // Set default parentId to head branch once loaded
  useEffect(() => {
    if (headBranch && !formData.parentId) {
      setFormData((prev) => ({ ...prev, parentId: headBranch.id }));
    }
  }, [headBranch, formData.parentId]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const q = searchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q))
      );
    });
  }, [branches, searchQuery]);

  const handleCreateSubBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      await api.post("/api/branches", {
        name: formData.name,
        code: formData.code.toUpperCase().trim(),
        city: formData.city,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        parentId: formData.parentId || headBranch?.id,
        status: "APPROVED",
      });

      setDialogOpen(false);
      setFormData({
        name: "",
        code: "",
        city: "Addis Ababa",
        address: "",
        phone: "",
        email: "",
        parentId: headBranch?.id || "",
      });
      await loadBranches();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj.response?.data?.message || "Failed to create sub-branch. Please check code uniqueness.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCampuses = branches.length;
  const approvedCampuses = branches.filter((b) => b.status === "APPROVED").length;
  const subBranchesCount = branches.filter((b) => b.parentId !== null).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Multi-Branch & Campus Management"
        subtitle="Manage primary campus operations and create satellite sub-branches (e.g. Branch A creating Branch A1, A2)."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Sub-Branches" },
        ]}
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold shadow-xs">
                <Plus className="h-4 w-4" />
                Spawn Sub-Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-brand-primary" />
                  Spawn New Sub-Branch
                </DialogTitle>
                <DialogDescription>
                  Create an auxiliary or satellite campus subordinate to your main branch (e.g. Branch A $\rightarrow$ A1, A2).
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateSubBranch} className="space-y-4 py-2">
                {errorMsg && (
                  <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-lg border border-destructive/20 font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="parent" className="text-xs font-semibold">
                    Parent Branch (Headquarter)
                  </Label>
                  <Input
                    id="parent"
                    value={headBranch ? `${headBranch.name} (${headBranch.code})` : "Main Campus (Branch A)"}
                    disabled
                    className="bg-muted text-xs font-medium cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This sub-branch will be linked under {headBranch?.name || "Branch A"}.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="code" className="text-xs font-semibold">
                      Campus Code *
                    </Label>
                    <Input
                      id="code"
                      placeholder="e.g. CAMPUS-A3"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold">
                      City / Region *
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g. Addis Ababa"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">
                    Sub-Branch Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Bole Satellite Campus (Branch A3)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-semibold">
                    Campus Address
                  </Label>
                  <Input
                    id="address"
                    placeholder="e.g. Ring Road Junction, Tech Hub"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      Contact Phone
                    </Label>
                    <Input
                      id="phone"
                      placeholder="+251 11 ..."
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Campus Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="branch@novatechnology.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="text-xs font-bold gap-2">
                    {submitting ? "Creating..." : "Create Sub-Branch"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* 1. CAMPUS KPI OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Total Campuses
              </span>
              <div className="text-2xl font-black text-foreground">{totalCampuses}</div>
              <p className="text-xs text-muted-foreground">{approvedCampuses} approved & operational</p>
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
                Sub-Branches Spawned
              </span>
              <div className="text-2xl font-black text-foreground">{subBranchesCount}</div>
              <p className="text-xs text-muted-foreground">Auxiliary campuses (A1, A2...)</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <GitBranch className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Head Campus Authority
              </span>
              <div className="text-base font-bold text-foreground truncate max-w-[180px]">
                {headBranch?.name || "Main Campus (Branch A)"}
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                Master Licensed
              </Badge>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. CAMPUS HIERARCHY TREE BANNER */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Hierarchical Multi-Branch System</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              As Branch Admin A, you have master authority to spawn and govern sub-branches A1 and A2.
              Each sub-branch inherits institutional academic rules while maintaining isolated timetables and enrollments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-background/80 px-3 py-1.5 rounded-lg border border-border text-xs font-mono font-bold">
          <span>Branch A</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-blue-600">Sub A1</span>
          <span className="text-muted-foreground">,</span>
          <span className="text-blue-600">Sub A2</span>
        </div>
      </div>

      {/* 3. BRANCH DIRECTORY & FILTER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by branch name, code, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            Showing <strong className="text-foreground">{filteredBranches.length}</strong> campuses
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : filteredBranches.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-border bg-card">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No campuses match your search.</p>
            <p className="text-xs text-muted-foreground mt-1">Try another keyword or create a new sub-branch.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBranches.map((branch) => {
              const isHead = branch.isHead;
              const parentName = branch.parent?.name || "Main Campus (Branch A)";

              return (
                <Card
                  key={branch.id}
                  className={`border transition-all hover:shadow-md ${
                    isHead
                      ? "border-brand-primary/40 bg-brand-primary/[0.02]"
                      : "border-border bg-card"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-brand-primary">
                            {branch.code}
                          </span>
                          {isHead ? (
                            <Badge className="bg-brand-primary text-white text-[10px] font-bold">
                              Head Campus (HQ)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-300 font-medium">
                              Sub-Branch of {branch.parent?.code || "A"}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base font-bold mt-1 text-foreground leading-tight">
                          {branch.name}
                        </CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          branch.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px] font-bold"
                            : "bg-amber-500/10 text-amber-700 border-amber-300 text-[10px] font-bold"
                        }
                      >
                        {branch.status === "APPROVED" ? "Operational" : "Pending Approval"}
                      </Badge>
                    </div>
                    {branch.parentId && (
                      <CardDescription className="text-xs flex items-center gap-1 pt-1 text-muted-foreground">
                        <GitBranch className="h-3 w-3 text-brand-primary shrink-0" />
                        Parent: <span className="font-semibold text-foreground truncate">{parentName}</span>
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0 text-xs">
                    {/* Location & Contact Info */}
                    <div className="space-y-1.5 text-muted-foreground border-y border-border/60 py-3">
                      {branch.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{branch.address ? `${branch.address}, ` : ""}{branch.city}</span>
                        </div>
                      )}
                      {branch.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                      )}
                      {branch.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{branch.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Operational Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/50 border border-border/40">
                        <div className="text-sm font-bold text-foreground">
                          {branch.sub_branches_count || branch.subBranches?.length || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Sub-Campuses</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 border border-border/40">
                        <div className="text-sm font-bold text-foreground">
                          {branch.students_count || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Students</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 border border-border/40">
                        <div className="text-sm font-bold text-foreground">
                          {branch.faculty_count || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Faculty</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
