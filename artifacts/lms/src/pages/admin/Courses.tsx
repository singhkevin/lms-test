import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListCourses, useCreateCourse } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical, Edit, FileVideo, Globe, Archive } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListCoursesQueryKey } from "@workspace/api-client-react";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
});

export default function AdminCourses() {
  const [search, setSearch] = useState("");
  const { data: coursesData, isLoading } = useListCourses({ search, limit: 50 });
  const createMutation = useCreateCourse();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(createSchema)
  });

  const onSubmit = async (data: any) => {
    try {
      await createMutation.mutateAsync({ data });
      toast.success("Course created successfully");
      setIsDialogOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
    } catch (error) {
      toast.error("Failed to create course");
    }
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
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Course Title</Label>
                  <Input {...register("title")} placeholder="e.g. Advanced React Patterns" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Price (USD)</Label>
                  <Input type="number" step="0.01" {...register("price")} placeholder="0.00 (leave blank for free)" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Short Description</Label>
                  <Input {...register("description")} placeholder="Brief overview..." className="rounded-xl" />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-xl">
                    {createMutation.isPending ? "Creating..." : "Create Course"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/50 flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search courses..." 
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
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Enrollments</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading courses...</td>
                  </tr>
                ) : coursesData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                        <p>No courses found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  coursesData?.data?.map((course) => (
                    <tr key={course.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {course.thumbnailUrl ? (
                              <img src={course.thumbnailUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                            ) : (
                              <FileVideo className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{course.title}</div>
                            <div className="text-xs text-muted-foreground">{course.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          course.status === 'published' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                          course.status === 'archived' ? 'bg-muted text-muted-foreground border-border' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {course.price ? `$${course.price.toFixed(2)}` : 'Free'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {course.enrollmentCount}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <Link href={`/admin/courses/${course.id}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit Content
                              </DropdownMenuItem>
                            </Link>
                            {course.status !== 'published' && (
                              <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-600">
                                <Globe className="mr-2 h-4 w-4" /> Publish Course
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                              <Archive className="mr-2 h-4 w-4" /> Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
