import { useParams } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetCourse, useListSections, useCreateSection, useCreateLesson } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Settings, Video, FileText, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { getListSectionsQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: course } = useGetCourse(id);
  const { data: sections } = useListSections(id);
  const createSection = useCreateSection();
  const createLesson = useCreateLesson();
  const queryClient = useQueryClient();

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isLessonOpen, setIsLessonOpen] = useState(false);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle) return;
    try {
      await createSection.mutateAsync({
        courseId: id,
        data: { title: newSectionTitle }
      });
      toast.success("Section added");
      setNewSectionTitle("");
      setIsSectionOpen(false);
      queryClient.invalidateQueries({ queryKey: getListSectionsQueryKey(id) });
    } catch {
      toast.error("Failed to add section");
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle || !activeSectionId) return;
    try {
      await createLesson.mutateAsync({
        courseId: id,
        sectionId: activeSectionId,
        data: { title: lessonTitle, type: "video" }
      });
      toast.success("Lesson added");
      setLessonTitle("");
      setIsLessonOpen(false);
      queryClient.invalidateQueries({ queryKey: getListSectionsQueryKey(id) });
    } catch {
      toast.error("Failed to add lesson");
    }
  };

  if (!course) return <AdminLayout><div className="animate-pulse h-96 bg-muted rounded-xl" /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link href="/admin/courses" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to courses
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                {course.status}
              </span>
              <span className="text-sm text-muted-foreground font-medium">{course.slug}</span>
            </div>
            <h1 className="text-3xl font-display font-bold">{course.title}</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl border-border/60">
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Button>
            <Button className="rounded-xl shadow-md shadow-primary/20">
              Publish Course
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-xl font-bold font-display">Curriculum</h2>
          <Dialog open={isSectionOpen} onOpenChange={setIsSectionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Plus className="mr-2 h-4 w-4" /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>New Section</DialogTitle></DialogHeader>
              <form onSubmit={handleAddSection} className="space-y-4">
                <Input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="Section Title" />
                <Button type="submit" disabled={createSection.isPending}>Add</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {sections?.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
              <p className="text-muted-foreground mb-4">No sections yet. Start building your curriculum.</p>
              <Button onClick={() => setIsSectionOpen(true)} variant="secondary" className="rounded-xl">Add First Section</Button>
            </div>
          ) : (
            sections?.map((section) => (
              <Card key={section.id} className="overflow-hidden border-border/50 shadow-sm rounded-2xl">
                <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{section.title}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => { setActiveSectionId(section.id); setIsLessonOpen(true); }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Lesson
                  </Button>
                </div>
                <CardContent className="p-0">
                  {section.lessons?.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center bg-card">No lessons in this section.</div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {section.lessons?.map((lesson, idx) => (
                        <div key={lesson.id} className="flex items-center justify-between p-4 px-6 hover:bg-muted/10 transition-colors group bg-card">
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground text-sm font-medium w-4">{idx + 1}</span>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              {lesson.type === 'video' ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <span className="font-medium text-foreground">{lesson.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {lesson.isFree && <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Free Preview</span>}
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Edit</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Lesson Dialog hidden mostly */}
        <Dialog open={isLessonOpen} onOpenChange={setIsLessonOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
            <form onSubmit={handleAddLesson} className="space-y-4">
              <Input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="Lesson Title" />
              <Button type="submit" disabled={createLesson.isPending}>Add Lesson</Button>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
