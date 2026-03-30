import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListCourses, useCreateCourse, usePublishCourse, useUnpublishCourse } from "@workspace/api-client-react";
import { getListCoursesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MoreVertical, Edit, Globe, Archive, BookOpen, Video, Radio } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type CourseTypeOption = "recorded" | "live";

export default function AdminCourses() {
  const [search, setSearch] = useState("");
  const { data: coursesData, isLoading } = useListCourses({ search, limit: 50 });
  const createMutation = useCreateCourse();
  const publishMutation = usePublishCourse();
  const unpublishMutation = useUnpublishCourse();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    longDescription: "",
    thumbnailUrl: "",
    price: "",
    courseType: "recorded" as CourseTypeOption,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    try {
      await createMutation.mutateAsync({
        data: {
          title: form.title,
          description: form.description || undefined,
          longDescription: form.longDescription || undefined,
          thumbnailUrl: form.thumbnailUrl || undefined,
          price: form.price ? Number(form.price) : undefined,
          courseType: form.courseType,
        },
      });
      toast.success("Course created successfully");
      setIsDialogOpen(false);
      setForm({ title: "", description: "", longDescription: "", thumbnailUrl: "", price: "", courseType: "recorded" });
      invalidate();
    } catch {
      toast.error("Failed to create course");
    }
  };

  const handlePublish = async (courseId: string) => {
    const listKey = getListCoursesQueryKey();
    const prev = queryClient.getQueryData(listKey);
    queryClient.setQueryData(listKey, (old: { data?: { id: string; status: string }[] } | undefined) =>
      old ? { ...old, data: old.data?.map(c => c.id === courseId ? { ...c, status: "published" } : c) } : old
    );
    try {
      await publishMutation.mutateAsync({ courseId });
      toast.success("Course published");
    } catch {
      queryClient.setQueryData(listKey, prev);
      toast.error("Failed to publish");
    } finally {
      invalidate();
    }
  };

  const handleUnpublish = async (courseId: string) => {
    const listKey = getListCoursesQueryKey();
    const prev = queryClient.getQueryData(listKey);
    queryClient.setQueryData(listKey, (old: { data?: { id: string; status: string }[] } | undefined) =>
      old ? { ...old, data: old.data?.map(c => c.id === courseId ? { ...c, status: "draft" } : c) } : old
    );
    try {
      await unpublishMutation.mutateAsync({ courseId });
      toast.success("Course set to draft");
    } catch {
      queryClient.setQueryData(listKey, prev);
      toast.error("Failed to unpublish");
    } finally {
      invalidate();
    }
  };

  const typeIcon = (type: string) => {
    if (type === "live") return <Radio className="h-3.5 w-3.5 text-rose-500" />;
    return <Video className="h-3.5 w-3.5 text-blue-500" />;
  };

  const typeBadge = (type: string) => {
    if (type === "live") return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Courses</h1>
            <p className="text-muted-foreground mt-1">Manage your academy's curriculum.</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* Course Type Toggle */}
                <div className="space-y-2">
                  <Label>Course Type</Label>
                  <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, courseType: "recorded" }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${form.courseType === "recorded" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Video className="h-4 w-4" /> Recorded
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, courseType: "live" }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${form.courseType === "live" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Radio className="h-4 w-4 text-rose-500" /> Live (Zoom)
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.courseType === "live"
                      ? "Live courses use Zoom links — you'll add meeting links per lesson."
                      : "Recorded courses use Loom video embeds per lesson."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Course Title <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Advanced React Patterns"
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Short Description</Label>
                  <Input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief overview shown in listings (1-2 sentences)"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Long Description</Label>
                  <Textarea
                    value={form.longDescription}
                    onChange={e => setForm(f => ({ ...f, longDescription: e.target.value }))}
                    placeholder="Full course description shown on the course landing page..."
                    className="rounded-xl min-h-[120px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Thumbnail URL</Label>
                  <Input
                    value={form.thumbnailUrl}
                    onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
                    placeholder="https://..."
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Price (₹ INR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0 (leave empty for free)"
                    className="rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-xl">
                    {createMutation.isPending ? "Creating..." : "Create Course"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl bg-muted/30 border-border/50"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : coursesData?.data?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                <p>No courses yet. Create your first one!</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {coursesData?.data?.map((course) => (
                <div key={course.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{course.title}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        course.status === "published" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }`}>{course.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs ${typeBadge(course.courseType).split(" ").filter(c => c.includes("text-")).join(" ")}`}>
                        {typeIcon(course.courseType)}
                        <span className="capitalize">{course.courseType}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{course.moduleCount} module{course.moduleCount !== 1 ? "s" : ""}</span>
                      <span className="text-xs text-muted-foreground">{course.enrollmentCount} enrolled</span>
                      <span className="text-xs font-medium text-foreground">{course.price ? `₹${course.price.toLocaleString()}` : "Free"}</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <Link href={`/admin/courses/${course.id}`}>
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> Edit Content
                        </DropdownMenuItem>
                      </Link>
                      {course.status !== "published" ? (
                        <DropdownMenuItem onClick={() => handlePublish(course.id)} className="cursor-pointer text-emerald-600 focus:text-emerald-600">
                          <Globe className="mr-2 h-4 w-4" /> Publish
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleUnpublish(course.id)} className="cursor-pointer text-amber-600 focus:text-amber-600">
                          <Archive className="mr-2 h-4 w-4" /> Unpublish
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
