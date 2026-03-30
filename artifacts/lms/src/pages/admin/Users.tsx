import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListUsers, useDeleteUser, useUpdateUser, useCreateUser, useCreateEnrollment, useListCourses } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, MoreVertical, Shield, User, GraduationCap, Trash2, RefreshCw, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListUsersQueryKey } from "@workspace/api-client-react";

type RoleTab = "all" | "student" | "instructor";

const roleIcon = (role: string) => {
  if (role === "owner") return <Shield className="w-3.5 h-3.5 text-purple-500" />;
  if (role === "instructor") return <GraduationCap className="w-3.5 h-3.5 text-orange-500" />;
  return <User className="w-3.5 h-3.5 text-blue-500" />;
};

const roleBadge = (role: string) => {
  if (role === "owner") return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  if (role === "instructor") return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  return "bg-blue-500/10 text-blue-600 border-blue-500/20";
};

export default function AdminUsers() {
  const [tab, setTab] = useState<RoleTab>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [assignTarget, setAssignTarget] = useState<UserProfile | null>(null);
  const [assignCourseId, setAssignCourseId] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" as "student" | "instructor" });

  const queryClient = useQueryClient();
  const { data, isLoading } = useListUsers({ search, role: tab === "all" ? undefined : tab, limit: 100 });
  const { data: coursesData } = useListCourses({ limit: 100 });
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();
  const createEnrollment = useCreateEnrollment();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser.mutateAsync({ data: form });
      toast.success("User created");
      setAddOpen(false);
      setForm({ name: "", email: "", password: "", role: "student" });
      invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create user");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync({ userId: deleteTarget.id });
      toast.success("User deleted");
      setDeleteTarget(null);
      invalidate();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleRoleChange = async (userId: string, role: "student" | "instructor") => {
    try {
      await updateUser.mutateAsync({ userId, updateUserRequest: { role } });
      toast.success("Role updated");
      invalidate();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget || !assignCourseId) return;
    try {
      await createEnrollment.mutateAsync({ createEnrollmentRequest: { userId: assignTarget.id, courseId: assignCourseId } });
      toast.success(`${assignTarget.name} enrolled successfully`);
      setAssignTarget(null);
      setAssignCourseId("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to enroll");
    }
  };

  const tabs: { key: RoleTab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All Users", icon: <User className="w-3.5 h-3.5" /> },
    { key: "student", label: "Students", icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { key: "instructor", label: "Instructors", icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Users</h1>
            <p className="text-muted-foreground mt-1">Manage learners and instructors across the platform.</p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px] rounded-2xl">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Temporary Password</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" required minLength={8} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as "student" | "instructor" }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button type="submit" disabled={createUser.isPending} className="rounded-xl">
                    {createUser.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl bg-muted/30 border-border/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading users...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No users found.</td></tr>
                ) : data?.data?.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                          <AvatarImage src={user.avatarUrl || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadge(user.role)}`}>
                        {roleIcon(user.role)}
                        <span className="capitalize">{user.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl">
                          {user.role === "student" && (
                            <DropdownMenuItem onClick={() => { setAssignTarget(user); setAssignCourseId(""); }} className="cursor-pointer">
                              <BookOpen className="mr-2 h-4 w-4" /> Assign Course
                            </DropdownMenuItem>
                          )}
                          {user.role !== "owner" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(user.id, user.role === "student" ? "instructor" : "student")}
                                className="cursor-pointer"
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Make {user.role === "student" ? "Instructor" : "Student"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(user)} className="cursor-pointer text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Course Dialog */}
      <Dialog open={!!assignTarget} onOpenChange={open => !open && setAssignTarget(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Assign Course to {assignTarget?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Select Course</Label>
              <Select value={assignCourseId} onValueChange={setAssignCourseId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a course..." />
                </SelectTrigger>
                <SelectContent>
                  {coursesData?.data?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAssignTarget(null)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={!assignCourseId || createEnrollment.isPending} className="rounded-xl">
                {createEnrollment.isPending ? "Enrolling..." : "Enroll Student"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
