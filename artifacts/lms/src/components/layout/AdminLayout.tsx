import React, { useEffect } from "react";
import { Navbar } from "./Navbar";
import { AdminSidebar, AdminMobileHeader } from "./AdminSidebar";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/staff/login");
    } else if (!isLoading && user && user.role !== 'owner' && user.role !== 'instructor') {
      setLocation("/my-learning");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (user.role !== 'owner' && user.role !== 'instructor')) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <AdminMobileHeader />
      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
