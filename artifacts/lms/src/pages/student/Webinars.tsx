import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, Clock, Users, Video, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  zoomUrl: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  rsvpCount: number;
  hasRsvped: boolean;
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function statusBadge(status: string) {
  if (status === "live") return "bg-emerald-500 text-white";
  if (status === "ended" || status === "cancelled") return "bg-muted text-muted-foreground";
  return "bg-primary/10 text-primary";
}

function statusLabel(status: string) {
  if (status === "live") return "🔴 Live Now";
  if (status === "ended") return "Ended";
  if (status === "cancelled") return "Cancelled";
  return "Upcoming";
}

function RsvpButton({ webinar }: { webinar: Webinar }) {
  const queryClient = useQueryClient();
  const [optimisticRsvped, setOptimisticRsvped] = useState<boolean | null>(null);
  const hasRsvped = optimisticRsvped !== null ? optimisticRsvped : webinar.hasRsvped;

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      const method = hasRsvped ? "DELETE" : "POST";
      const res = await fetch(`/api/webinars/${webinar.id}/rsvp`, {
        method,
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: () => {
      setOptimisticRsvped(!hasRsvped);
    },
    onSuccess: () => {
      toast.success(hasRsvped ? "RSVP cancelled" : "You're signed up!");
      queryClient.invalidateQueries({ queryKey: ["student-webinars"] });
    },
    onError: () => {
      setOptimisticRsvped(null);
      toast.error("Something went wrong. Please try again.");
    },
  });

  if (webinar.status === "ended" || webinar.status === "cancelled") return null;

  return (
    <Button
      size="sm"
      variant={hasRsvped ? "outline" : "default"}
      className="rounded-xl text-xs"
      onClick={e => { e.preventDefault(); rsvpMutation.mutate(); }}
      disabled={rsvpMutation.isPending}
    >
      {rsvpMutation.isPending ? "..." : hasRsvped ? "Cancel RSVP" : "RSVP"}
    </Button>
  );
}

export default function StudentWebinars() {
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");

  const { data, isLoading } = useQuery<{ data: Webinar[] }>({
    queryKey: ["student-webinars", filter],
    queryFn: async () => {
      const res = await fetch(`/api/webinars?filter=${filter}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load webinars");
      return res.json();
    },
  });

  const webinars = data?.data ?? [];

  return (
    <MainLayout>
      <div className="bg-muted/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-balance">Live Webinars</h1>
          <p className="text-lg text-muted-foreground">Join live sessions with instructors. RSVP to get the Zoom link.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit mb-8">
          {(["upcoming", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "upcoming" ? "Upcoming" : "All"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : webinars.length === 0 ? (
          <div className="text-center py-20">
            <Video className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-xl font-bold mb-2">No webinars {filter === "upcoming" ? "scheduled" : "found"}</h3>
            <p className="text-muted-foreground">Check back soon for upcoming live sessions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {webinars.map(webinar => (
              <Link key={webinar.id} href={`/webinars/${webinar.id}`}>
                <div className="group bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer">
                  {/* Image */}
                  <div className="aspect-video bg-primary/5 relative overflow-hidden">
                    {webinar.imageUrl ? (
                      <img
                        src={webinar.imageUrl}
                        alt={webinar.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(webinar.status)}`}>
                        {statusLabel(webinar.status)}
                      </span>
                    </div>
                    {webinar.hasRsvped && (
                      <div className="absolute top-3 right-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-500 text-white">
                          RSVP'd ✓
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <h3 className="font-bold text-base line-clamp-2 group-hover:text-primary transition-colors">{webinar.title}</h3>
                    {webinar.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{webinar.description}</p>
                    )}

                    <div className="space-y-1.5 text-xs text-muted-foreground mt-auto">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(new Date(webinar.scheduledAt), "EEE, MMM d, yyyy 'at' h:mm a")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {webinar.durationMinutes} minutes
                      </div>
                      {webinar.rsvpCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {webinar.rsvpCount} {webinar.rsvpCount === 1 ? "person" : "people"} signed up
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/40">
                      <RsvpButton webinar={webinar} />
                      <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Details <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
