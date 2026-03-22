import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, LogOut, Settings, LayoutDashboard, User } from "lucide-react";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="bg-primary/10 p-2 rounded-xl">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">LMS Academy</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link href="/" className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              Catalog
            </Link>
            {isAuthenticated && user?.role === 'student' && (
              <Link href="/my-learning" className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                My Learning
              </Link>
            )}
            <Link href="/community" className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              Community
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
                Sign In
              </Link>
              <Link href="/register" className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-5 py-2 items-center justify-center rounded-xl font-medium transition-colors shadow-sm shadow-primary/20 hover:shadow-md hover:-translate-y-0.5 duration-200">
                Get Started
              </Link>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border/50 shadow-sm">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatarUrl || ''} alt={user?.name || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(user?.role === 'owner' || user?.role === 'instructor') && (
                  <Link href="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Admin Console</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
