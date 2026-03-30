import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { MessageSquare, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface Enquiry {
  id: string;
  courseId: string;
  courseName: string | null;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  upscAttempts: number;
  createdAt: string;
}

function useEnquiries(page: number) {
  return useQuery<{ data: Enquiry[]; page: number; limit: number }>({
    queryKey: ["enquiries", page],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/enquiries?page=${page}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch enquiries");
      return res.json();
    },
  });
}

export default function AdminEnquiries() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEnquiries(page);
  const enquiries = data?.data ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Course Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Students who expressed interest in enrolling — reach out to convert them.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : enquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No enquiries yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Students interested in your courses will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
              <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-border/50 bg-muted/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">UPSC Attempts</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</span>
              </div>
              <div className="divide-y divide-border/30">
                {enquiries.map(eq => (
                  <div key={eq.id} className="px-6 py-4 hover:bg-muted/10 transition-colors">
                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 items-center">
                      <div>
                        <p className="font-medium text-sm">{eq.firstName} {eq.lastName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{eq.email}</p>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm truncate">{eq.courseName ?? "—"}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{eq.phone}</span>
                      <span className="text-sm text-muted-foreground">{eq.age}</span>
                      <span className="text-sm text-muted-foreground">{eq.upscAttempts}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(eq.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {/* Mobile */}
                    <div className="md:hidden space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{eq.firstName} {eq.lastName}</p>
                          <p className="text-xs text-muted-foreground">{eq.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {new Date(eq.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3 text-primary" />
                        <span className="truncate">{eq.courseName ?? "—"}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Phone: {eq.phone}</span>
                        <span>Age: {eq.age}</span>
                        <span>Attempts: {eq.upscAttempts}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" disabled={enquiries.length < 50} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
