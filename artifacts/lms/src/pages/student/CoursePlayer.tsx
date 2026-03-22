import { useParams, Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetCourse, useListSections, useGetMyProgress, useMarkLessonComplete } from "@workspace/api-client-react";
import { ArrowLeft, CheckCircle2, Circle, PlayCircle, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyProgressQueryKey } from "@workspace/api-client-react";

export default function CoursePlayer() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading: courseLoading } = useGetCourse(courseId);
  const { data: sections } = useListSections(courseId);
  const { data: progress } = useGetMyProgress({ courseId });
  const markComplete = useMarkLessonComplete();
  const queryClient = useQueryClient();

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Derive active lesson
  const allLessons = sections?.flatMap(s => s.lessons) || [];
  const currentLesson = allLessons.find(l => l.id === activeLessonId) || allLessons[0];
  
  if (!activeLessonId && allLessons.length > 0) {
    setActiveLessonId(allLessons[0].id);
  }

  const completedLessonIds = new Set(progress?.map(p => p.lessonId) || []);
  const progressPercentage = allLessons.length > 0 ? Math.round((completedLessonIds.size / allLessons.length) * 100) : 0;

  const handleMarkComplete = async () => {
    if (!currentLesson) return;
    try {
      await markComplete.mutateAsync({ lessonId: currentLesson.id });
      toast.success("Lesson completed!");
      queryClient.invalidateQueries({ queryKey: getGetMyProgressQueryKey({ courseId }) });
      
      // Auto advance
      const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
      if (currentIndex < allLessons.length - 1) {
        setActiveLessonId(allLessons[currentIndex + 1].id);
      }
    } catch {
      toast.error("Error marking complete");
    }
  };

  if (courseLoading) return <MainLayout><div className="h-screen animate-pulse bg-muted" /></MainLayout>;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Player Navbar */}
      <header className="h-16 flex-shrink-0 border-b border-border/40 bg-card flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-4">
          <Link href="/my-learning">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-6 w-px bg-border/50 mx-2" />
          <h1 className="font-semibold truncate max-w-[300px] md:max-w-md">{course?.title}</h1>
        </div>
        <div className="flex items-center gap-4 hidden sm:flex">
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{progressPercentage}% Complete</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-black flex flex-col relative">
          {currentLesson ? (
            <>
              <div className="flex-1 w-full flex items-center justify-center bg-black min-h-[50vh]">
                {currentLesson.type === 'video' ? (
                  currentLesson.videoUrl ? (
                    <iframe 
                      src={currentLesson.videoUrl} 
                      className="w-full h-full border-0" 
                      allowFullScreen 
                      title={currentLesson.title}
                    />
                  ) : (
                    <div className="text-white/50 flex flex-col items-center">
                      <PlayCircle className="h-16 w-16 mb-4 opacity-50" />
                      <p>Video processing...</p>
                    </div>
                  )
                ) : (
                  <div className="p-12 w-full max-w-4xl mx-auto prose prose-invert">
                    <h1 className="text-white">{currentLesson.title}</h1>
                    <div className="text-white/80" dangerouslySetInnerHTML={{ __html: currentLesson.content || 'No content provided.' }} />
                  </div>
                )}
              </div>
              
              <div className="bg-card p-6 border-t border-border/20 flex-shrink-0 flex justify-between items-center z-10 relative shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                <div>
                  <h2 className="text-xl font-bold">{currentLesson.title}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{currentLesson.type === 'video' ? `${currentLesson.durationMinutes || 0} mins` : 'Reading material'}</p>
                </div>
                <Button 
                  onClick={handleMarkComplete} 
                  disabled={completedLessonIds.has(currentLesson.id) || markComplete.isPending}
                  className={`rounded-xl px-8 h-12 ${completedLessonIds.has(currentLesson.id) ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                >
                  {completedLessonIds.has(currentLesson.id) ? (
                    <><CheckCircle2 className="mr-2 h-5 w-5" /> Completed</>
                  ) : (
                    "Mark as Complete"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/50">Select a lesson to begin</div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 bg-card border-l border-border/40 hidden lg:flex flex-col">
          <div className="p-4 border-b border-border/40">
            <h3 className="font-bold font-display text-lg">Course Content</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {sections?.map((section) => (
              <div key={section.id}>
                <h4 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">{section.title}</h4>
                <div className="space-y-1">
                  {section.lessons?.map((lesson) => {
                    const isCompleted = completedLessonIds.has(lesson.id);
                    const isActive = activeLessonId === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors ${
                          isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-emerald-500'}`} />
                        ) : (
                          <Circle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                        <div className="flex-1 overflow-hidden">
                          <p className={`text-sm font-medium line-clamp-2 ${isCompleted && !isActive ? 'text-muted-foreground' : ''}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground opacity-80">
                            {lesson.type === 'video' ? <PlayCircle className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            <span>{lesson.durationMinutes ? `${lesson.durationMinutes}m` : ''}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
