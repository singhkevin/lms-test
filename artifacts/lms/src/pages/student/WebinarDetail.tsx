import { useParams, Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, Clock, Users, Video, ArrowLeft, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
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

export default function WebinarDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [optimisticRsvped, setOptimisticRsvped] = useState<boolean | null>(null);

  const { data: webinar, isLoading } = useQuery<Webinar>({
    queryKey: ["webinar", id],
    queryFn: async () => {
      const res = await fetch(`/api/webinars/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  const hasRsvped = optimisticRsvped !== null ? optimisticRsvped : (webinar?.hasRsvped ?? false);
  const rsvpCount = webinar
    ? webinar.rsvpCount + (optimisticRsvped === null ? 0 : optimisticRsvped ? 1 : -1)
    : 0;

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      const method = hasRsvped ? "DELETE" : "POST";
      const res = await fetch(`/api/webinars/${id}/rsvp`, {
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
      toast.success(hasRsvped ? "RSVP cancelled" : "You're signed up! Check your email for the Zoom link closer to the session.");
      queryClient.invalidateQueries({ queryKey: ["webinar", id] });
      queryClient.invalidateQueries({ queryKey: ["student-webinars"] });
    },
    onError: () => {
      setOptimisticRsvped(null);
      toast.error("Something went wrong. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        </div>
      </MainLayout>
    );
  }

  if (!webinar) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Webinar not found</h2>
          <Link href="/webinars">
            <Button variant="outline" className="rounded-xl">Back to Webinars</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const isLive = webinar.status === "live";
  const isEnded = webinar.status === "ended" || webinar.status === "cancelled";

  return (
    <MainLayout>
      {/* Hero */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        {webinar.imageUrl ? (
          <img
            src={webinar.imageUrl}
            alt={webinar.title}
            className="absolute inset-0 w-full h-full object-cover opacity-25 blur-sm"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-violet-950 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <Link href="/webinars">
            <button className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Webinars
            </button>
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Status badge */}
              <div className="flex items-center gap-3 mb-5">
                {isLive && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    LIVE NOW
                  </span>
                )}
                {isEnded && (
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-medium">
                    {webinar.status === "cancelled" ? "Cancelled" : "Ended"}
                  </span>
                )}
                {!isLive && !isEnded && (
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary-foreground/80 border border-primary/30 text-xs font-medium">
                    Upcoming
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-balance leading-tight">
                {webinar.title}
              </h1>

              {webinar.description && (
                <p className="text-lg text-white/75 mb-8 max-w-xl text-balance leading-relaxed">
                  {webinar.description}
                </p>
              )}

              <div className="flex flex-wrap gap-5 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(webinar.scheduledAt), "EEEE, MMMM d, yyyy")}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(new Date(webinar.scheduledAt), "h:mm a")} · {webinar.durationMinutes} min
                </div>
                {rsvpCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {rsvpCount} {rsvpCount === 1 ? "person" : "people"} signed up
                  </div>
                )}
              </div>
            </div>

            {/* CTA card */}
            <div className="lg:justify-self-end w-full max-w-sm">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-white">
                {isEnded ? (
                  <div className="text-center py-4">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p className="text-white/60 font-medium">This webinar has ended.</p>
                  </div>
                ) : isLive ? (
                  <div className="space-y-4 text-center">
                    <p className="text-white/80 text-sm">This session is live now!</p>
                    {hasRsvped ? (
                      <a href={webinar.zoomUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="lg" className="w-full rounded-xl h-12 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl">
                          <ExternalLink className="w-4 h-4 mr-2" /> Join on Zoom
                        </Button>
                      </a>
                    ) : (
                      <p className="text-white/60 text-sm">RSVP before the session to receive the Zoom link.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="text-center">
                      <p className="text-2xl font-bold mb-1">{format(new Date(webinar.scheduledAt), "MMM d")}</p>
                      <p className="text-white/60 text-sm">{format(new Date(webinar.scheduledAt), "h:mm a · yyyy")}</p>
                    </div>

                    {hasRsvped ? (
                      <>
                        <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-300">You're registered!</p>
                            <p className="text-xs text-white/60">The Zoom link will be available here before the session.</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl h-11 border-white/20 text-white hover:bg-white/10"
                          onClick={() => rsvpMutation.mutate()}
                          disabled={rsvpMutation.isPending}
                        >
                          {rsvpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel RSVP"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-white/70 text-sm text-center">Reserve your spot to get the Zoom link.</p>
                        <Button
                          size="lg"
                          className="w-full rounded-xl h-12 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30"
                          onClick={() => rsvpMutation.mutate()}
                          disabled={rsvpMutation.isPending}
                        >
                          {rsvpMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {rsvpMutation.isPending ? "Signing up..." : "RSVP — Reserve My Spot"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Webinar image below hero (mobile-friendly) */}
      {webinar.imageUrl && (
        <div className="container mx-auto px-4 -mt-8 mb-0 hidden">
          <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-border/30">
            <img src={webinar.imageUrl} alt={webinar.title} className="w-full object-cover" />
          </div>
        </div>
      )}
    </MainLayout>
  );
}
