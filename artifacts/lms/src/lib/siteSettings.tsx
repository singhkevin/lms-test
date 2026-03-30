import React, { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface SiteSettings {
  id: number;
  siteTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  socialShareImageUrl: string | null;
}

const defaults: SiteSettings = {
  id: 0,
  siteTitle: "LMS Academy",
  logoUrl: null,
  faviconUrl: null,
  socialShareImageUrl: null,
};

const SiteSettingsContext = createContext<SiteSettings>(defaults);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings");
      if (!res.ok) return defaults;
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const settings = data ?? defaults;

  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
  }, [settings.siteTitle]);

  useEffect(() => {
    if (settings.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings.faviconUrl]);

  useEffect(() => {
    if (settings.socialShareImageUrl) {
      let meta = document.querySelector<HTMLMetaElement>("meta[property='og:image']");
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", "og:image");
        document.head.appendChild(meta);
      }
      meta.content = settings.socialShareImageUrl;
    }
  }, [settings.socialShareImageUrl]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
