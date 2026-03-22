import { Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useGetCourseCatalog } from "@workspace/api-client-react";
import { ArrowRight, BookOpen, Star, PlayCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const { data: catalog, isLoading } = useGetCourseCatalog({ page: 1, limit: 3 });

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="absolute inset-0 z-[-1]">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Abstract soft background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        
        <div className="container mx-auto px-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              New Courses Available
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-balance text-foreground mb-6">
              Master New Skills with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Expert Instructors</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 text-balance leading-relaxed">
              Join thousands of learners elevating their careers through our premium, interactive courses designed for the modern professional.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 rounded-2xl text-base shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300">
                  Start Learning Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/courses" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full h-14 px-8 rounded-2xl text-base bg-background/50 backdrop-blur-sm hover:bg-background/80 border-border/50">
                  Browse Catalog
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-card/50 relative border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm border border-primary/10">
                <PlayCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">High-Quality Video</h3>
              <p className="text-muted-foreground leading-relaxed">Crystal clear 4K video lessons that you can watch anytime, anywhere, on any device.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 shadow-sm border border-accent/10">
                <Star className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-3">Expert Instructors</h3>
              <p className="text-muted-foreground leading-relaxed">Learn directly from industry professionals with years of real-world experience.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 shadow-sm border border-emerald-500/10">
                <ShieldCheck className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Lifetime Access</h3>
              <p className="text-muted-foreground leading-relaxed">Once enrolled, you get lifetime access to the course content and all future updates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Courses Preview */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Featured Courses</h2>
              <p className="text-muted-foreground text-lg">Hand-picked by our educational team.</p>
            </div>
            <Link href="/courses" className="hidden md:inline-flex items-center text-primary font-medium hover:underline">
              View all courses <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3].map(i => (
                <div key={i} className="h-[400px] rounded-2xl bg-muted animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {catalog?.data?.map(course => (
                <Link key={course.id} href={`/courses/${course.slug}`}>
                  <div className="group h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
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
                        <span className="text-muted-foreground font-medium">{course.instructorName || 'Instructor'}</span>
                        <span className="font-semibold text-primary">
                          {course.price ? `$${course.price.toFixed(2)}` : 'Free'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{course.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">{course.description}</p>
                      <div className="pt-4 border-t border-border/50 flex justify-between items-center text-sm font-medium">
                        <span className="text-muted-foreground">{course.enrollmentCount} enrolled</span>
                        <span className="text-primary flex items-center">
                          Learn more <ArrowRight className="ml-1 h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-8 text-center md:hidden">
            <Link href="/courses">
              <Button variant="outline" className="w-full">View all courses</Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
