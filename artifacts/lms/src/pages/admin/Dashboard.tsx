import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAnalyticsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CreditCard, GraduationCap, ArrowUpRight, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAnalyticsSummary();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded-md"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card rounded-2xl border border-border/50"></div>)}
          </div>
          <div className="h-[400px] bg-card rounded-2xl border border-border/50"></div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { title: "Total Revenue", value: `$${stats?.totalRevenue?.toFixed(2) || '0.00'}`, icon: CreditCard, trend: "+12.5%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Active Enrollments", value: stats?.activeEnrollments || 0, icon: GraduationCap, trend: "+5.2%", color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Users", value: stats?.totalUsers || 0, icon: Users, trend: "+18.1%", color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Published Courses", value: stats?.publishedCourses || 0, icon: BookOpen, trend: "Stable", color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's an overview of your academy.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <Card key={i} className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                  <span className="text-emerald-500 font-medium">{stat.trend}</span>
                  <span className="text-muted-foreground ml-2">vs last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Recent Orders</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-4">
                {stats?.recentOrders?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent orders</p>
                ) : (
                  stats?.recentOrders?.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{order.userName || 'Guest'}</p>
                          <p className="text-xs text-muted-foreground">{order.courseName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">${order.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Enrollments */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Recent Enrollments</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-4">
                {stats?.recentEnrollments?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent enrollments</p>
                ) : (
                  stats?.recentEnrollments?.slice(0, 5).map(enroll => (
                    <div key={enroll.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <GraduationCap className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{enroll.userName}</p>
                          <p className="text-xs text-muted-foreground">{enroll.courseName}</p>
                        </div>
                      </div>
                      <div className="text-right">
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
        </div>
      </div>
    </AdminLayout>
  );
}
