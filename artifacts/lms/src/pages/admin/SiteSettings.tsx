import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSiteSettings } from "@/lib/siteSettings";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, Globe, Image, Link as LinkIcon } from "lucide-react";

export default function SiteSettings() {
  const settings = useSiteSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    siteTitle: "",
    logoUrl: "",
    faviconUrl: "",
    socialShareImageUrl: "",
  });

  useEffect(() => {
    setForm({
      siteTitle: settings.siteTitle ?? "",
      logoUrl: settings.logoUrl ?? "",
      faviconUrl: settings.faviconUrl ?? "",
      socialShareImageUrl: settings.socialShareImageUrl ?? "",
    });
  }, [settings]);

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const body: Record<string, string | null> = {
        siteTitle: form.siteTitle || "LMS Academy",
        logoUrl: form.logoUrl || null,
        faviconUrl: form.faviconUrl || null,
        socialShareImageUrl: form.socialShareImageUrl || null,
      };

      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }

      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Site settings saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Site Settings</h1>
            <p className="text-muted-foreground text-sm">Customize your site's branding and identity</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" /> General
            </CardTitle>
            <CardDescription>Basic information shown across your site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteTitle">Site Title</Label>
              <Input
                id="siteTitle"
                value={form.siteTitle}
                onChange={(e) => field("siteTitle", e.target.value)}
                placeholder="LMS Academy"
              />
              <p className="text-xs text-muted-foreground">Appears in the browser tab and navigation bar</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="h-4 w-4" /> Branding
            </CardTitle>
            <CardDescription>Upload your assets to a hosting service (e.g. Cloudinary, Imgur) and paste the URL here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={form.logoUrl}
                onChange={(e) => field("logoUrl", e.target.value)}
                placeholder="https://your-cdn.com/logo.png"
              />
              {form.logoUrl && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50 inline-flex items-center gap-3">
                  <img src={form.logoUrl} alt="Logo preview" className="h-8 max-w-[120px] object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Shown in the top navigation bar (replaces the default icon)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faviconUrl">Favicon URL</Label>
              <Input
                id="faviconUrl"
                value={form.faviconUrl}
                onChange={(e) => field("faviconUrl", e.target.value)}
                placeholder="https://your-cdn.com/favicon.ico"
              />
              {form.faviconUrl && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50 inline-flex items-center gap-3">
                  <img src={form.faviconUrl} alt="Favicon preview" className="h-6 w-6 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <span className="text-xs text-muted-foreground">Preview (32×32 or 64×64 .ico/.png recommended)</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Small icon shown in browser tabs and bookmarks</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="socialShareImageUrl">Social Share Image URL</Label>
              <Input
                id="socialShareImageUrl"
                value={form.socialShareImageUrl}
                onChange={(e) => field("socialShareImageUrl", e.target.value)}
                placeholder="https://your-cdn.com/og-image.png"
              />
              {form.socialShareImageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border/50 max-w-sm">
                  <img src={form.socialShareImageUrl} alt="OG image preview" className="w-full object-cover" style={{ maxHeight: 160 }} onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <p className="text-xs text-muted-foreground">Shown when your site is shared on social media (1200×630px recommended)</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="px-8">
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
