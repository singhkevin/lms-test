import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAnalyticsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, GraduationCap, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAnalyticsSummary();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded-md"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-card rounded-2xl border border-border/50"></div>)}
          </div>
          <div className="h-[360px] bg-card rounded-2xl border border-border/50"></div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { title: "Active Enrollments", value: stats?.activeEnrollments ?? 0,  icon: GraduationCap, color: "text-blue-500",   bg: "bg-blue-500/10"   },
    { title: "Total Users",        value: stats?.totalUsers ?? 0,          icon: Users,         color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Published Courses",  value: stats?.publishedCourses ?? 0,    icon: BookOpen,      color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Welcome back! Here's an overview of your academy.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {statCards.map((stat, i) => (
            <Card key={i} className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-5 md:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{stat.value}</h3>
                  </div>
                  <div className={`p-2.5 md:p-3 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Recent Enrollments */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base md:text-lg font-bold">Recent Enrollments</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-2">
                {!stats?.recentEnrollments?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent enrollments</p>
                ) : (
                  stats.recentEnrollments.slice(0, 5).map(enroll => (
                    <div key={enroll.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-accent/10 flex items-center justify-center">
                          <GraduationCap className="h-4 w-4 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{enroll.userName}</p>
                          <p className="text-xs text-muted-foreground truncate">{enroll.courseName}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                          {enroll.status}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(enroll.enrolledAt), 'MMM d')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { label: "Add Course",    href: "/admin/courses",       icon: BookOpen,      color: "bg-primary/10 text-primary" },
                  { label: "Manage Users",  href: "/admin/users",         icon: Users,         color: "bg-indigo-500/10 text-indigo-600" },
                  { label: "Enrollments",   href: "/admin/enrollments",   icon: GraduationCap, color: "bg-blue-500/10 text-blue-600" },
                  { label: "Site Settings", href: "/admin/site-settings", icon: BookOpen,      color: "bg-orange-500/10 text-orange-600" },
                ].map(action => (
                  <a
                    key={action.href}
                    href={action.href}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all text-center group"
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.color}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
