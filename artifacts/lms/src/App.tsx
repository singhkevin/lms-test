import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { SiteSettingsProvider } from "@/lib/siteSettings";
import NotFound from "@/pages/not-found";

// Pages
import Landing from "@/pages/public/Landing";
import CourseCatalog from "@/pages/public/CourseCatalog";
import CourseLanding from "@/pages/public/CourseLanding";
import Login from "@/pages/auth/Login";
import StaffLogin from "@/pages/auth/StaffLogin";
import Register from "@/pages/auth/Register";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCourses from "@/pages/admin/Courses";
import AdminCourseDetail from "@/pages/admin/CourseDetail";
import AdminUsers from "@/pages/admin/Users";
import AdminSiteSettings from "@/pages/admin/SiteSettings";
import AdminEnrollments from "@/pages/admin/Enrollments";
import AdminWebinars from "@/pages/admin/Webinars";
import AdminEnquiries from "@/pages/admin/Enquiries";

// Student Pages
import MyLearning from "@/pages/student/MyLearning";
import CoursePlayer from "@/pages/student/CoursePlayer";
import StudentWebinars from "@/pages/student/Webinars";
import WebinarDetail from "@/pages/student/WebinarDetail";
import Profile from "@/pages/student/Profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Landing} />
      <Route path="/courses" component={CourseCatalog} />
      <Route path="/courses/:slug" component={CourseLanding} />
      
      {/* Auth */}
      <Route path="/login" component={Login} />
      <Route path="/staff/login" component={StaffLogin} />
      <Route path="/register" component={Register} />
      
      {/* Student */}
      <Route path="/profile" component={Profile} />
      <Route path="/webinars" component={StudentWebinars} />
      <Route path="/webinars/:id" component={WebinarDetail} />
      <Route path="/my-learning" component={MyLearning} />
      <Route path="/my-learning/:courseId" component={CoursePlayer} />
      
      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/courses/:id" component={AdminCourseDetail} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/enrollments" component={AdminEnrollments} />
      <Route path="/admin/webinars" component={AdminWebinars} />
      <Route path="/admin/enquiries" component={AdminEnquiries} />
      <Route path="/admin/site-settings" component={AdminSiteSettings} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <SiteSettingsProvider>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </SiteSettingsProvider>
        </WouterRouter>
        <Toaster position="top-center" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
