import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { Plus, MoreVertical, Video, Clock, CalendarDays, ExternalLink, Pencil, Trash2, Link as LinkIcon, Users, Image } from "lucide-react";

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  zoomUrl: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  createdAt: string;
  rsvpCount: number;
}

interface WebinarForm {
  title: string;
  description: string;
  imageUrl: string;
  zoomUrl: string;
  scheduledAt: string;
  durationMinutes: string;
  status: string;
}

const defaultForm: WebinarForm = {
  title: "",
  description: "",
  imageUrl: "",
  zoomUrl: "",
  scheduledAt: "",
  durationMinutes: "60",
  status: "upcoming",
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function statusBadge(status: string, scheduledAt: string) {
  const past = isPast(new Date(scheduledAt));
  if (status === "cancelled") return "bg-red-500/10 text-red-600 border-red-500/20";
  if (status === "live") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (past || status === "ended") return "bg-muted text-muted-foreground border-border";
  return "bg-primary/10 text-primary border-primary/20";
}

function statusLabel(status: string, scheduledAt: string) {
  const past = isPast(new Date(scheduledAt));
  if (status === "cancelled") return "Cancelled";
  if (status === "live") return "🔴 Live";
  if (status === "ended") return "Ended";
  if (past) return "Ended";
  return "Upcoming";
}

export default function AdminWebinars() {
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Webinar | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Webinar | null>(null);
  const [form, setForm] = useState<WebinarForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Webinar[] }>({
    queryKey: ["webinars", filter],
    queryFn: async () => {
      const res = await fetch(`/api/webinars?filter=${filter}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load webinars");
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["webinars"] });

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(w: Webinar) {
    setEditTarget(w);
    setForm({
      title: w.title,
      description: w.description ?? "",
      imageUrl: w.imageUrl ?? "",
      zoomUrl: w.zoomUrl,
      scheduledAt: w.scheduledAt.slice(0, 16),
      durationMinutes: String(w.durationMinutes),
      status: w.status,
    });
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.zoomUrl.trim()) { toast.error("Zoom link is required"); return; }
    if (!form.scheduledAt) { toast.error("Date & time is required"); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        zoomUrl: form.zoomUrl.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: parseInt(form.durationMinutes) || 60,
        status: form.status,
      };

      if (editTarget) {
        const res = await fetch(`/api/webinars/${editTarget.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Webinar updated");
      } else {
        const res = await fetch("/api/webinars", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Webinar scheduled");
      }

      setDialogOpen(false);
      invalidate();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/webinars/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Webinar deleted");
      setDeleteTarget(null);
      invalidate();
    } catch {
      toast.error("Failed to delete webinar");
    }
  }

  const webinars = data?.data ?? [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Webinars</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage live Zoom webinar sessions.</p>
          </div>

          <Button onClick={openCreate} className="rounded-xl shadow-md shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Schedule Webinar
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
          {(["upcoming", "past", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "upcoming" ? "Upcoming" : "Past"}
            </button>
          ))}
        </div>

        {/* Webinar list */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : webinars.length === 0 ? (
            <div className="py-16 text-center">
              <Video className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No webinars {filter === "upcoming" ? "scheduled" : "found"}.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {filter === "upcoming" ? "Schedule your first webinar to get started." : "Past webinars will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {webinars.map(webinar => (
                <div key={webinar.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  {/* Thumbnail or icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {webinar.imageUrl ? (
                      <img
                        src={webinar.imageUrl}
                        alt={webinar.title}
                        className="h-14 w-20 rounded-xl object-cover border border-border/40"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{webinar.title}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(webinar.status, webinar.scheduledAt)}`}>
                        {statusLabel(webinar.status, webinar.scheduledAt)}
                      </span>
                      {webinar.rsvpCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-600 border border-violet-500/20">
                          <Users className="h-3 w-3" />
                          {webinar.rsvpCount} signed up
                        </span>
                      )}
                    </div>
                    {webinar.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{webinar.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(webinar.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {webinar.durationMinutes} min
                      </span>
                      <a
                        href={webinar.zoomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" />
                        Zoom Link
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem onClick={() => openEdit(webinar)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <a href={webinar.zoomUrl} target="_blank" rel="noopener noreferrer">
                        <DropdownMenuItem className="cursor-pointer">
                          <ExternalLink className="mr-2 h-4 w-4" /> Open Zoom Link
                        </DropdownMenuItem>
                      </a>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(webinar)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Webinar" : "Schedule New Webinar"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Live Q&A — Advanced React"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What will this webinar cover?"
                className="rounded-xl resize-none min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Image className="h-4 w-4" /> Cover Image URL
              </Label>
              <Input
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                type="url"
                className="rounded-xl"
              />
              {form.imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-border/50 aspect-video bg-muted">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Zoom Meeting Link <span className="text-destructive">*</span></Label>
              <Input
                value={form.zoomUrl}
                onChange={e => setForm(f => ({ ...f, zoomUrl: e.target.value }))}
                placeholder="https://zoom.us/j/..."
                type="url"
                required
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Paste your Zoom invite link here. Shown to RSVP'd students.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date & Time <span className="text-destructive">*</span></Label>
                <Input
                  value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  type="datetime-local"
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                  type="number"
                  min="15"
                  step="15"
                  className="rounded-xl"
                />
              </div>
            </div>

            {editTarget && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live Now</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? "Saving..." : editTarget ? "Save Changes" : "Schedule Webinar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the webinar and all RSVPs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
