import { MainLayout } from "@/components/layout/MainLayout";
import { useListEnrollments } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Play, BookOpen, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function MyLearning() {
  const { data: enrollments, isLoading } = useListEnrollments({ limit: 50, status: 'active' });

  return (
    <MainLayout>
      <div className="bg-muted/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-balance">My Learning</h1>
          <p className="text-lg text-muted-foreground">Pick up right where you left off and discover new skills.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : enrollments?.data?.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <img src={`${import.meta.env.BASE_URL}images/empty-state.png`} alt="Empty" className="w-48 h-auto mx-auto mb-8 opacity-80 mix-blend-multiply dark:mix-blend-screen" />
            <h3 className="text-2xl font-bold mb-3">No courses yet</h3>
            <p className="text-muted-foreground mb-8 text-balance">You haven't enrolled in any courses. Explore our catalog to start your learning journey.</p>
            <Link href="/courses">
              <Button size="lg" className="rounded-xl px-8">Browse Catalog</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {enrollments?.data?.map(enrollment => (
              <Card key={enrollment.id} className="overflow-hidden rounded-2xl border-border/50 shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col">
                <div className="aspect-[2/1] bg-primary/5 relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <BookOpen className="h-12 w-12 text-primary/20 absolute" />
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <h3 className="text-white font-bold text-lg line-clamp-1">{enrollment.courseName}</h3>
                  </div>
                </div>
                <CardContent className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center text-xs text-muted-foreground mb-4 font-medium">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Enrolled {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}
                    </div>
                    {/* Placeholder for progress since enrollment payload doesn't include it directly */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Course Progress</span>
                        <span className="text-primary">Continue</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-1/4 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <Link href={`/my-learning/${enrollment.courseId}`} className="w-full">
                    <Button className="w-full rounded-xl shadow-md shadow-primary/20 group-hover:-translate-y-0.5 transition-transform">
                      <Play className="w-4 h-4 mr-2 fill-current" /> Resume Learning
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
