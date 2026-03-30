import { useParams } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useGetCourse, useListSections, useCreateSection, useCreateLesson,
  useUpdateLesson, useDeleteLesson, useDeleteSection,
  usePublishCourse, useUnpublishCourse, useUpdateSection,
} from "@workspace/api-client-react";
import type { Lesson } from "@workspace/api-client-react";
import { getListSectionsQueryKey, getGetCourseQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Video, FileText, Radio, Pencil, Trash2, Globe, Archive, Link as LinkIcon, CreditCard, Save } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type LessonType = "video" | "text" | "live";

interface LessonForm {
  title: string;
  type: LessonType;
  videoUrl: string;
  zoomMeetingUrl: string;
  zoomPassword: string;
  pdfUrl: string;
  content: string;
  durationMinutes: string;
  isFree: boolean;
}

const defaultLessonForm: LessonForm = {
  title: "",
  type: "video",
  videoUrl: "",
  zoomMeetingUrl: "",
  zoomPassword: "",
  pdfUrl: "",
  content: "",
  durationMinutes: "",
  isFree: false,
};

function lessonTypeIcon(type: string) {
  if (type === "live") return <Radio className="h-4 w-4 text-rose-500" />;
  if (type === "video") return <Video className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-slate-500" />;
}

function lessonTypeBadge(type: string) {
  if (type === "live") return "bg-rose-500/10 text-rose-600 border border-rose-500/20";
  if (type === "video") return "bg-blue-500/10 text-blue-600 border border-blue-500/20";
  return "bg-slate-500/10 text-slate-600 border border-slate-500/20";
}

function validateLoomUrl(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.hostname === "www.loom.com" || u.hostname === "loom.com";
  } catch {
    return false;
  }
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading: courseLoading } = useGetCourse(id);
  const { data: sections } = useListSections(id);
  const queryClient = useQueryClient();

  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const publishCourse = usePublishCourse();
  const unpublishCourse = useUnpublishCourse();

  const [paymentLink, setPaymentLink] = useState<string>("");
  const [savingPaymentLink, setSavingPaymentLink] = useState(false);

  useEffect(() => {
    if (course) setPaymentLink((course as any).paymentLink ?? "");
  }, [course?.id]);

  const handleSavePaymentLink = async () => {
    setSavingPaymentLink(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "/api"}/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentLink: paymentLink.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Payment link saved");
      invalidateCourse();
    } catch {
      toast.error("Failed to save payment link");
    } finally {
      setSavingPaymentLink(false);
    }
  };

  const [sectionModal, setSectionModal] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [editSectionModal, setEditSectionModal] = useState(false);

  const [lessonModal, setLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState<LessonForm>(defaultLessonForm);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{ lessonId: string; sectionId: string } | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<string | null>(null);

  const invalidateSections = () => queryClient.invalidateQueries({ queryKey: getListSectionsQueryKey(id) });
  const invalidateCourse = () => queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(id) });

  const isLive = course?.courseType === "live";

  const openAddLesson = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setEditLesson(null);
    setLessonForm({ ...defaultLessonForm, type: isLive ? "live" : "video" });
    setLessonModal(true);
  };

  const openEditLesson = (lesson: Lesson, sectionId: string) => {
    setActiveSectionId(sectionId);
    setEditLesson(lesson);
    setLessonForm({
      title: lesson.title,
      type: (lesson.type === "quiz" ? "text" : lesson.type) as LessonType,
      videoUrl: lesson.videoUrl || "",
      zoomMeetingUrl: lesson.zoomMeetingUrl || "",
      zoomPassword: lesson.zoomPassword || "",
      pdfUrl: lesson.pdfUrl || "",
      content: lesson.content || "",
      durationMinutes: lesson.durationMinutes?.toString() || "",
      isFree: lesson.isFree,
    });
    setLessonModal(true);
  };

  const handleAddSection = async () => {
    if (!sectionTitle.trim()) return;
    try {
      await createSection.mutateAsync({ courseId: id, data: { title: sectionTitle } });
      toast.success("Module added");
      setSectionTitle("");
      setSectionModal(false);
      invalidateSections();
    } catch {
      toast.error("Failed to add module");
    }
  };

  const handleEditSection = async () => {
    if (!editSectionId) return;
    try {
      await updateSection.mutateAsync({ courseId: id, sectionId: editSectionId, data: { title: editSectionTitle } });
      toast.success("Module renamed");
      setEditSectionModal(false);
      invalidateSections();
    } catch {
      toast.error("Failed to rename module");
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteSectionTarget) return;
    try {
      await deleteSection.mutateAsync({ courseId: id, sectionId: deleteSectionTarget });
      toast.success("Module deleted");
      setDeleteSectionTarget(null);
      invalidateSections();
    } catch {
      toast.error("Failed to delete module");
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) { toast.error("Lesson title is required"); return; }

    if (lessonForm.type === "video" && lessonForm.videoUrl && !validateLoomUrl(lessonForm.videoUrl)) {
      toast.error("Video URL must be a valid Loom link (loom.com)");
      return;
    }

    const payload = {
      title: lessonForm.title,
      type: lessonForm.type,
      videoUrl: lessonForm.type === "video" ? lessonForm.videoUrl || undefined : undefined,
      zoomMeetingUrl: lessonForm.type === "live" ? lessonForm.zoomMeetingUrl || undefined : undefined,
      zoomPassword: lessonForm.type === "live" ? lessonForm.zoomPassword || undefined : undefined,
      pdfUrl: lessonForm.pdfUrl || undefined,
      content: lessonForm.content || undefined,
      durationMinutes: lessonForm.durationMinutes ? Number(lessonForm.durationMinutes) : undefined,
      isFree: lessonForm.isFree,
    };

    try {
      if (editLesson) {
        await updateLesson.mutateAsync({
          courseId: id,
          sectionId: activeSectionId!,
          lessonId: editLesson.id,
          data: payload,
        });
        toast.success("Lesson updated");
      } else {
        await createLesson.mutateAsync({
          courseId: id,
          sectionId: activeSectionId!,
          data: { ...payload, type: lessonForm.type },
        });
        toast.success("Lesson added");
      }
      setLessonModal(false);
      invalidateSections();
    } catch {
      toast.error(editLesson ? "Failed to update lesson" : "Failed to add lesson");
    }
  };

  const handleDeleteLesson = async () => {
    if (!deleteLessonTarget) return;
    try {
      await deleteLesson.mutateAsync({
        courseId: id,
        sectionId: deleteLessonTarget.sectionId,
        lessonId: deleteLessonTarget.lessonId,
      });
      toast.success("Lesson deleted");
      setDeleteLessonTarget(null);
      invalidateSections();
    } catch {
      toast.error("Failed to delete lesson");
    }
  };

  const handlePublish = async () => {
    const courseKey = getGetCourseQueryKey(id);
    const prev = queryClient.getQueryData<typeof course>(courseKey);
    queryClient.setQueryData(courseKey, (old: typeof course) => old ? { ...old, status: "published" } : old);
    try {
      await publishCourse.mutateAsync({ courseId: id });
      toast.success("Course published!");
    } catch {
      queryClient.setQueryData(courseKey, prev);
      toast.error("Failed to publish");
    } finally {
      invalidateCourse();
    }
  };

  const handleUnpublish = async () => {
    const courseKey = getGetCourseQueryKey(id);
    const prev = queryClient.getQueryData<typeof course>(courseKey);
    queryClient.setQueryData(courseKey, (old: typeof course) => old ? { ...old, status: "draft" } : old);
    try {
      await unpublishCourse.mutateAsync({ courseId: id });
      toast.success("Course moved to draft");
    } catch {
      queryClient.setQueryData(courseKey, prev);
      toast.error("Failed to unpublish");
    } finally {
      invalidateCourse();
    }
  };

  if (courseLoading || !course) {
    return <AdminLayout><div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-2xl" /><div className="h-96 bg-muted rounded-2xl" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link href="/admin/courses" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to courses
        </Link>

        {/* Course Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                course.status === "published" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}>
                {course.status}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                isLive ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
              }`}>
                {isLive ? <Radio className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                {isLive ? "Live (Zoom)" : "Recorded (Loom)"}
              </span>
              <span className="text-sm text-muted-foreground font-medium">{course.slug}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">{course.title}</h1>
            {course.description && <p className="text-muted-foreground mt-1 text-sm">{course.description}</p>}
          </div>
          <div className="flex gap-3">
            {course.status !== "published" ? (
              <Button
                onClick={handlePublish}
                disabled={publishCourse.isPending}
                className="rounded-xl shadow-md shadow-primary/20"
              >
                <Globe className="mr-2 h-4 w-4" />
                {publishCourse.isPending ? "Publishing..." : "Publish Course"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleUnpublish}
                disabled={unpublishCourse.isPending}
                className="rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              >
                <Archive className="mr-2 h-4 w-4" />
                {unpublishCourse.isPending ? "Unpublishing..." : "Unpublish"}
              </Button>
            )}
          </div>
        </div>

        {/* Payment Link */}
        <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Razorpay Payment Link</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Paste a Razorpay payment link. Students seeing this paid course will be directed here to pay. Leave empty for free or enquiry-only courses.
          </p>
          <div className="flex gap-3">
            <Input
              value={paymentLink}
              onChange={e => setPaymentLink(e.target.value)}
              placeholder="https://rzp.io/l/..."
              className="rounded-xl flex-1"
            />
            <Button
              onClick={handleSavePaymentLink}
              disabled={savingPaymentLink}
              size="sm"
              className="rounded-xl shrink-0"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {savingPaymentLink ? "Saving..." : "Save"}
            </Button>
          </div>
          {paymentLink && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> Payment link active — students will be directed to Razorpay.
            </p>
          )}
        </div>

        {/* Curriculum */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display">Curriculum</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLive ? "Add modules and lessons with Zoom meeting links." : "Add modules and lessons with Loom video embeds."}
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setSectionTitle(""); setSectionModal(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Module
          </Button>
        </div>

        <div className="space-y-4">
          {!sections || sections.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Plus className="h-7 w-7 text-primary" />
                </div>
                <p className="text-muted-foreground">No modules yet. Start building your curriculum.</p>
                <Button onClick={() => { setSectionTitle(""); setSectionModal(true); }} variant="secondary" className="rounded-xl mt-1">
                  Add First Module
                </Button>
              </div>
            </div>
          ) : (
            sections.map((section, sIdx) => (
              <Card key={section.id} className="overflow-hidden border-border/50 shadow-sm rounded-2xl">
                <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Module {sIdx + 1}</span>
                    <span className="text-muted-foreground">/</span>
                    <h3 className="font-semibold">{section.title}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                      onClick={() => openAddLesson(section.id)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Lesson
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                      onClick={() => { setEditSectionId(section.id); setEditSectionTitle(section.title); setEditSectionModal(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                      onClick={() => setDeleteSectionTarget(section.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-0">
                  {!section.lessons || section.lessons.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center bg-card">
                      No lessons yet.{" "}
                      <button onClick={() => openAddLesson(section.id)} className="text-primary hover:underline font-medium">Add one</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {section.lessons.map((lesson, lIdx) => (
                        <div key={lesson.id} className="flex items-center justify-between p-4 px-6 hover:bg-muted/10 transition-colors group bg-card">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <span className="text-muted-foreground text-sm font-medium w-5 shrink-0">{lIdx + 1}</span>
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                              {lessonTypeIcon(lesson.type)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-foreground block truncate">{lesson.title}</span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${lessonTypeBadge(lesson.type)}`}>
                                  {lesson.type}
                                </span>
                                {lesson.isFree && (
                                  <span className="text-xs bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium border border-emerald-500/20">
                                    Free Preview
                                  </span>
                                )}
                                {lesson.type === "video" && lesson.videoUrl && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <LinkIcon className="h-3 w-3" /> Loom
                                  </span>
                                )}
                                {lesson.type === "live" && lesson.zoomMeetingUrl && (
                                  <span className="text-xs text-rose-500 flex items-center gap-1">
                                    <Radio className="h-3 w-3" /> Zoom set
                                  </span>
                                )}
                                {lesson.pdfUrl && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <FileText className="h-3 w-3" /> PDF
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 rounded-lg text-muted-foreground hover:text-foreground"
                              onClick={() => openEditLesson(lesson, section.id)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteLessonTarget({ lessonId: lesson.id, sectionId: section.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
      </div>

      {/* Add Module Modal */}
      <Dialog open={sectionModal} onOpenChange={setSectionModal}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader><DialogTitle>Add Module</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Module Title</Label>
              <Input
                value={sectionTitle}
                onChange={e => setSectionTitle(e.target.value)}
                placeholder="e.g. Introduction to React"
                className="rounded-xl"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAddSection(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSectionModal(false)} className="rounded-xl">Cancel</Button>
              <Button type="button" onClick={handleAddSection} disabled={createSection.isPending} className="rounded-xl">
                {createSection.isPending ? "Adding..." : "Save Module"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Module Modal */}
      <Dialog open={editSectionModal} onOpenChange={setEditSectionModal}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader><DialogTitle>Rename Module</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Module Title</Label>
              <Input
                value={editSectionTitle}
                onChange={e => setEditSectionTitle(e.target.value)}
                className="rounded-xl"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleEditSection(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditSectionModal(false)} className="rounded-xl">Cancel</Button>
              <Button type="button" onClick={handleEditSection} disabled={updateSection.isPending} className="rounded-xl">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Lesson Modal */}
      <Dialog open={lessonModal} onOpenChange={open => { if (!open) setLessonModal(false); }}>
        <DialogContent className="rounded-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label>Lesson Title <span className="text-destructive">*</span></Label>
              <Input
                value={lessonForm.title}
                onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Setting up your environment"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Lesson Type</Label>
              <Select
                value={lessonForm.type}
                onValueChange={v => setLessonForm(f => ({ ...f, type: v as LessonType }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!isLive && <SelectItem value="video"><span className="flex items-center gap-2"><Video className="h-4 w-4 text-blue-500" /> Video (Loom)</span></SelectItem>}
                  {isLive && <SelectItem value="live"><span className="flex items-center gap-2"><Radio className="h-4 w-4 text-rose-500" /> Live Session (Zoom)</span></SelectItem>}
                  <SelectItem value="text"><span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Text / Notes</span></SelectItem>
                  {!isLive && <SelectItem value="live"><span className="flex items-center gap-2"><Radio className="h-4 w-4 text-rose-500" /> Live (Zoom)</span></SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Loom URL — Video type only */}
            {lessonForm.type === "video" && (
              <div className="space-y-2">
                <Label>Loom Video URL</Label>
                <Input
                  value={lessonForm.videoUrl}
                  onChange={e => setLessonForm(f => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="https://www.loom.com/share/..."
                  className="rounded-xl"
                />
                {lessonForm.videoUrl && !validateLoomUrl(lessonForm.videoUrl) && (
                  <p className="text-xs text-destructive">Must be a valid loom.com URL</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Paste your Loom share link (e.g. <span className="font-mono">loom.com/share/…</span>). It will be automatically converted to an embeddable player for students.
                </p>
              </div>
            )}

            {/* Zoom fields — Live type only */}
            {lessonForm.type === "live" && (
              <div className="space-y-3 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="flex items-center gap-2 text-rose-600 text-sm font-medium">
                  <Radio className="h-4 w-4" /> Zoom Meeting Details
                </div>
                <div className="space-y-2">
                  <Label>Meeting URL</Label>
                  <Input
                    value={lessonForm.zoomMeetingUrl}
                    onChange={e => setLessonForm(f => ({ ...f, zoomMeetingUrl: e.target.value }))}
                    placeholder="https://zoom.us/j/..."
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meeting Password</Label>
                  <Input
                    value={lessonForm.zoomPassword}
                    onChange={e => setLessonForm(f => ({ ...f, zoomPassword: e.target.value }))}
                    placeholder="e.g. abc123"
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                value={lessonForm.durationMinutes}
                onChange={e => setLessonForm(f => ({ ...f, durationMinutes: e.target.value }))}
                placeholder="e.g. 15"
                className="rounded-xl"
              />
            </div>

            {/* PDF URL */}
            <div className="space-y-2">
              <Label>PDF / Resource URL</Label>
              <Input
                value={lessonForm.pdfUrl}
                onChange={e => setLessonForm(f => ({ ...f, pdfUrl: e.target.value }))}
                placeholder="https://..."
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Optional PDF or resource link for this lesson.</p>
            </div>

            {/* Notes / Content */}
            <div className="space-y-2">
              <Label>Notes / Description</Label>
              <Textarea
                value={lessonForm.content}
                onChange={e => setLessonForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Optional text content or notes..."
                className="rounded-xl resize-none min-h-[80px]"
              />
            </div>

            {/* Free Preview Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
              <div>
                <p className="text-sm font-medium">Free Preview</p>
                <p className="text-xs text-muted-foreground">Allow non-enrolled users to access this lesson</p>
              </div>
              <Switch
                checked={lessonForm.isFree}
                onCheckedChange={v => setLessonForm(f => ({ ...f, isFree: v }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setLessonModal(false)} className="rounded-xl">Cancel</Button>
              <Button type="button" onClick={handleSaveLesson} disabled={createLesson.isPending || updateLesson.isPending} className="rounded-xl">
                {createLesson.isPending || updateLesson.isPending ? "Saving..." : editLesson ? "Save Changes" : "Add Lesson"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Confirmation */}
      <AlertDialog open={!!deleteLessonTarget} onOpenChange={open => !open && setDeleteLessonTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the lesson and its content.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLesson} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Section Confirmation */}
      <AlertDialog open={!!deleteSectionTarget} onOpenChange={open => !open && setDeleteSectionTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this module?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the module and all its lessons permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
