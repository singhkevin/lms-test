import { useState, useMemo, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListEnrollments, useCreateEnrollment, useRevokeEnrollment, useListCourses, useListUsers,
  getListEnrollmentsQueryKey,
} from "@workspace/api-client-react";
import type { Enrollment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap, Plus, Search, X, Users, BookOpen, ChevronLeft, ChevronRight,
  ShieldOff, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const LIMIT = 50;

type StatusFilter = "all" | "active" | "revoked" | "expired";

function statusBadge(status: string) {
  if (status === "active")
    return { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Active", icon: <CheckCircle2 className="h-3 w-3" /> };
  if (status === "revoked")
    return { cls: "bg-red-500/10 text-red-600 border-red-500/20", label: "Revoked", icon: <ShieldOff className="h-3 w-3" /> };
  return { cls: "bg-muted text-muted-foreground border-border", label: "Expired", icon: <Clock className="h-3 w-3" /> };
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold font-display">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function AssignCourseDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const createEnrollment = useCreateEnrollment();

  const { data: usersData } = useListUsers({ role: "student", limit: 200 });
  const { data: coursesData } = useListCourses({ limit: 200 });

  const filteredStudents = useMemo(() => {
    const list = usersData?.data ?? [];
    const q = studentSearch.toLowerCase();
    if (!q) return list;
    return list.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usersData?.data, studentSearch]);

  const selectedStudent = usersData?.data?.find(u => u.id === selectedUserId);

  function handleClose() {
    setStudentSearch("");
    setSelectedUserId("");
    setSelectedCourseId("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !selectedCourseId) {
      toast.error("Please select both a student and a course");
      return;
    }
    try {
      await createEnrollment.mutateAsync({ data: { userId: selectedUserId, courseId: selectedCourseId } });
      toast.success("Student enrolled successfully");
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.toLowerCase().includes("already enrolled") || msg.includes("409")) {
        toast.error("This student is already enrolled in that course");
      } else {
        toast.error("Failed to enroll student");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-[460px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Assign Course to Student
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Student picker */}
          <div className="space-y-2">
            <Label>Student <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="rounded-xl pl-9"
                placeholder="Search by name or email…"
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setSelectedUserId(""); }}
              />
            </div>
            {studentSearch && !selectedUserId && (
              <div className="border border-border/60 rounded-xl overflow-hidden max-h-44 overflow-y-auto shadow-sm bg-popover">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-3">No students found</p>
                ) : (
                  filteredStudents.slice(0, 20).map(u => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => { setSelectedUserId(u.id); setStudentSearch(u.name); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedStudent && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{selectedStudent.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{selectedStudent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedStudent.email}</p>
                </div>
                <button type="button" onClick={() => { setSelectedUserId(""); setStudentSearch(""); }} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Course picker */}
          <div className="space-y-2">
            <Label>Course <span className="text-destructive">*</span></Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a course…" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {(coursesData?.data ?? []).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" className="rounded-xl" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={!selectedUserId || !selectedCourseId || createEnrollment.isPending}
            >
              {createEnrollment.isPending ? "Enrolling…" : "Assign Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEnrollments() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assignOpen, setAssignOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Enrollment | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const revokeEnrollment = useRevokeEnrollment();
  const { data: coursesData } = useListCourses({ limit: 200 });

  // Stats queries — always fetch all three status counts
  const { data: totalData } = useListEnrollments({ limit: 1, page: 1 });
  const { data: activeData } = useListEnrollments({ limit: 1, page: 1, status: "active" });
  const { data: revokedData } = useListEnrollments({ limit: 1, page: 1, status: "revoked" });

  const enrollParams = {
    page,
    limit: LIMIT,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(courseFilter !== "all" ? { courseId: courseFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data, isLoading, isFetching } = useListEnrollments(enrollParams);

  const enrollments = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 350);
  }

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getListEnrollmentsQueryKey() });
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    try {
      await revokeEnrollment.mutateAsync({ enrollmentId: revokeTarget.id });
      toast.success("Enrollment revoked");
      setRevokeTarget(null);
      invalidateAll();
    } catch {
      toast.error("Failed to revoke enrollment");
    }
  }

  const hasFilters = !!debouncedSearch || courseFilter !== "all" || statusFilter !== "all";

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Enrollments</h1>
            <p className="text-muted-foreground mt-1">Manage and assign course enrollments for students.</p>
          </div>
          <Button onClick={() => setAssignOpen(true)} className="rounded-xl shadow-md shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" />
            Assign Course
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Total Enrollments"
            value={totalData?.total ?? "—"}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            label="Active"
            value={activeData?.total ?? "—"}
          />
          <StatCard
            icon={<ShieldOff className="h-5 w-5 text-red-500" />}
            label="Revoked"
            value={revokedData?.total ?? "—"}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 pr-9 rounded-xl"
              placeholder="Search by student name or email…"
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={courseFilter} onValueChange={v => { setCourseFilter(v); setPage(1); }}>
            <SelectTrigger className="rounded-xl w-full sm:w-52">
              <BookOpen className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">All Courses</SelectItem>
              {(coursesData?.data ?? []).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as StatusFilter); setPage(1); }}>
            <SelectTrigger className="rounded-xl w-full sm:w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground hover:text-foreground h-10 shrink-0"
              onClick={() => { clearSearch(); setCourseFilter("all"); setStatusFilter("all"); setPage(1); }}
            >
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          )}
        </div>

        {/* Result summary */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground -mt-4">
            {hasFilters
              ? `${total} result${total !== 1 ? "s" : ""} found`
              : `${total} enrollment${total !== 1 ? "s" : ""} total`}
          </p>
        )}

        {/* Table */}
        <div className={`bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden transition-opacity ${isFetching && !isLoading ? "opacity-70" : ""}`}>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="py-20 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">
                {hasFilters ? "No enrollments match your filters" : "No enrollments yet"}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {hasFilters ? "Try adjusting your search or filters." : "Assign a course to a student to get started."}
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={() => { clearSearch(); setCourseFilter("all"); setStatusFilter("all"); setPage(1); }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1.2fr_1.2fr_auto] gap-4 px-5 py-3 border-b border-border/50 bg-muted/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled On</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expires</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</span>
              </div>

              <div className="divide-y divide-border/30">
                {enrollments.map(enrollment => {
                  const badge = statusBadge(enrollment.status);
                  return (
                    <div key={enrollment.id} className="px-5 py-4 hover:bg-muted/10 transition-colors">
                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1.2fr_1.2fr_auto] gap-4 items-center">
                        {/* Student */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {(enrollment.userName ?? enrollment.userEmail ?? "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{enrollment.userName ?? "—"}</p>
                            <p className="text-xs text-muted-foreground truncate">{enrollment.userEmail ?? enrollment.userId}</p>
                          </div>
                        </div>

                        {/* Course */}
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm truncate">{enrollment.courseName ?? "—"}</span>
                        </div>

                        {/* Status */}
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                        </div>

                        {/* Enrolled on */}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(enrollment.enrolledAt), "MMM d, yyyy")}
                        </span>

                        {/* Expires */}
                        <span className="text-sm text-muted-foreground">
                          {enrollment.expiresAt
                            ? format(new Date(enrollment.expiresAt), "MMM d, yyyy")
                            : <span className="text-muted-foreground/50 text-xs">Never</span>}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center justify-end">
                          {enrollment.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 text-xs"
                              onClick={() => setRevokeTarget(enrollment)}
                            >
                              <ShieldOff className="h-3.5 w-3.5 mr-1" />
                              Revoke
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 pr-2">—</span>
                          )}
                        </div>
                      </div>

                      {/* Mobile row */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {(enrollment.userName ?? enrollment.userEmail ?? "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{enrollment.userName ?? "—"}</p>
                              <p className="text-xs text-muted-foreground truncate">{enrollment.userEmail ?? enrollment.userId}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${badge.cls}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{enrollment.courseName ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Enrolled {format(new Date(enrollment.enrolledAt), "MMM d, yyyy")}</span>
                          {enrollment.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 text-xs px-2"
                              onClick={() => setRevokeTarget(enrollment)}
                            >
                              <ShieldOff className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && total > LIMIT && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} &middot; {total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Course Dialog */}
      <AssignCourseDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSuccess={invalidateAll}
      />

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={open => !open && setRevokeTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this enrollment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke <strong>{revokeTarget?.userName ?? "the student"}</strong>'s access to{" "}
              <strong>{revokeTarget?.courseName ?? "this course"}</strong>. The student will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={revokeEnrollment.isPending}
            >
              {revokeEnrollment.isPending ? "Revoking…" : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
