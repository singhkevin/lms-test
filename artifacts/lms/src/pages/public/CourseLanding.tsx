import { useParams, Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetCourse, useListSections } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, PlayCircle, Users, BookOpen, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

// Assuming we map slug to ID for simplicity or API handles slug in GET /courses/:id
// In a real app, GET /courses/slug/:slug might exist. We'll use the param directly.
export default function CourseLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, isLoading } = useGetCourse(slug);
  const { data: sections } = useListSections(slug);
  const { isAuthenticated } = useAuth();

  if (isLoading) return <MainLayout><div className="h-screen animate-pulse bg-muted/30" /></MainLayout>;
  if (!course) return <MainLayout><div className="py-20 text-center">Course not found</div></MainLayout>;

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-slate-900 text-white py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-20 blur-sm" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-900 to-indigo-900 opacity-50" />
          )}
        </div>
        <div className="container mx-auto px-4 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-balance">{course.title}</h1>
            <p className="text-lg text-white/80 mb-8 max-w-xl text-balance">{course.description}</p>
            <div className="flex items-center gap-6 text-sm text-white/70">
              <div className="flex items-center"><Users className="w-4 h-4 mr-2" /> {course.enrollmentCount} enrolled</div>
              <div className="flex items-center"><BookOpen className="w-4 h-4 mr-2" /> {sections?.length || 0} sections</div>
            </div>
          </div>
          <div className="lg:justify-self-end">
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 p-8 rounded-3xl text-white">
              <div className="text-center mb-8">
                <div className="text-4xl font-bold mb-2">{course.price ? `$${course.price.toFixed(2)}` : 'Free'}</div>
                <p className="text-white/60 text-sm">Full lifetime access</p>
              </div>
              <div className="space-y-4">
                {isAuthenticated ? (
                  <Button size="lg" className="w-full rounded-xl h-14 text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30">
                    Enroll Now
                  </Button>
                ) : (
                  <Link href="/register">
                    <Button size="lg" className="w-full rounded-xl h-14 text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30">
                      Sign up to Enroll
                    </Button>
                  </Link>
                )}
                <div className="pt-6 space-y-3 text-sm">
                  <div className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span className="text-white/80">Self-paced learning</span></div>
                  <div className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span className="text-white/80">Access on mobile and desktop</span></div>
                  <div className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span className="text-white/80">Certificate of completion</span></div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <h2 className="text-3xl font-display font-bold mb-8">Course Curriculum</h2>
        <div className="space-y-4">
          {sections?.map((section, i) => (
            <div key={section.id} className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-sm">
              <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                <h3 className="font-semibold text-lg">Section {i+1}: {section.title}</h3>
              </div>
              <div className="divide-y divide-border/30">
                {section.lessons?.map(lesson => (
                  <div key={lesson.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/10">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="w-5 h-5 text-primary/60" />
                      <span className="font-medium text-sm">{lesson.title}</span>
                    </div>
                    {lesson.isFree && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full font-medium">Free Preview</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
