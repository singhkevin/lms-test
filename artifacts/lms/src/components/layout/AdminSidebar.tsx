import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Video,
  Settings,
  Menu,
  BookOpen as Logo,
  MessageSquare,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/lib/siteSettings";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: "Dashboard",     href: "/admin/dashboard",     icon: LayoutDashboard },
  { name: "Courses",       href: "/admin/courses",        icon: BookOpen },
  { name: "Users",         href: "/admin/users",          icon: Users },
  { name: "Enrollments",   href: "/admin/enrollments",    icon: GraduationCap },
  { name: "Webinars",      href: "/admin/webinars",       icon: Video },
  { name: "Enquiries",     href: "/admin/enquiries",      icon: MessageSquare },
  { name: "Site Settings", href: "/admin/site-settings",  icon: Settings },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();

  return (
    <nav className="flex-1 space-y-1">
      {navigation.map((item) => {
        const isActive = location.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
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
  );
}

export function AdminMobileHeader() {
  const [open, setOpen] = useState(false);
  const { siteTitle, logoUrl } = useSiteSettings();

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-16 z-40">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <LayoutDashboard className="h-4 w-4 text-primary" />
        Admin Console
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-4 py-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2 text-left">
              {logoUrl ? (
                <img src={logoUrl} alt={siteTitle} className="h-7 max-w-[120px] object-contain" />
              ) : (
                <>
                  <div className="bg-primary/10 p-1.5 rounded-lg">
                    <Logo className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-display font-bold text-base">{siteTitle}</span>
                </>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="py-4 px-3">
            <div className="px-3 mb-3">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Admin Console</p>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function AdminSidebar() {
  return (
    <div className="w-64 flex-shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-xl hidden md:flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="h-full py-6 px-3 flex flex-col gap-2">
        <div className="px-3 mb-2">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Admin Console</h2>
        </div>
        <NavItems />
      </div>
    </div>
  );
}
