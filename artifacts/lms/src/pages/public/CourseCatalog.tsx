import { MainLayout } from "@/components/layout/MainLayout";
import { useGetCourseCatalog } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function CourseCatalog() {
  const { data: catalog, isLoading } = useGetCourseCatalog({ page: 1, limit: 50 });

  return (
    <MainLayout>
      <div className="bg-primary/5 border-b border-border/50 py-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-6">Explore Our Catalog</h1>
          <p className="text-lg text-muted-foreground mb-8">Discover courses crafted by experts to help you level up your skills.</p>
          <div className="relative max-w-xl mx-auto shadow-lg shadow-black/5 rounded-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search for topics, skills, or courses..." 
              className="h-14 pl-12 pr-4 rounded-2xl bg-card border-border/60 text-base"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {catalog?.data?.map(course => (
              <Link key={course.id} href={`/courses/${course.slug}`}>
                <div className="group h-full bg-card rounded-3xl overflow-hidden border border-border/50 shadow-md shadow-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <BookOpen className="h-12 w-12 text-primary/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3 text-sm">
                      <span className="px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">{course.instructorName || 'Instructor'}</span>
                      <span className="font-bold text-lg text-primary">
                        {course.price ? `$${course.price.toFixed(2)}` : 'Free'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{course.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">{course.description}</p>
                    <Button variant="outline" className="w-full rounded-xl border-border/60 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                      View Details
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
