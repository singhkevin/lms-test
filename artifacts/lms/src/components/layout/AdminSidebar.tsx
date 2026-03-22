import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Video, 
  MessageSquare, 
  Link as LinkIcon 
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function AdminSidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Enrollments", href: "/admin/enrollments", icon: GraduationCap },
    { name: "Orders", href: "/admin/orders", icon: CreditCard },
    { name: "Live Sessions", href: "/admin/live-sessions", icon: Video },
    { name: "Community", href: "/admin/community", icon: MessageSquare },
    { name: "Affiliates", href: "/admin/affiliates", icon: LinkIcon },
  ];

  return (
    <div className="w-64 flex-shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-xl hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="h-full py-6 px-3 flex flex-col gap-2">
        <div className="px-3 mb-2">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Admin Console</h2>
        </div>
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "flex-shrink-0 h-5 w-5 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
