import React from "react";
import { Navbar } from "./Navbar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-primary/20 selection:text-primary">
      {/* Subtle ambient background glow */}
      <div className="fixed inset-0 z-[-1] pointer-events-none opacity-50">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[50%] rounded-full bg-accent/5 blur-[100px]" />
      </div>
      
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      
      <footer className="border-t border-border/40 py-12 bg-card/30 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} LMS Academy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
