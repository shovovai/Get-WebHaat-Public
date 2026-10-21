"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/** Shows "Install app" only when the browser offers PWA install (Chrome, Edge, Android) */
export const InstallAppButton = ({ className }: { className?: string }) => {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await promptEvent.prompt();
        setPromptEvent(null);
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-marigold",
        className
      )}
    >
      <Download className="h-4 w-4" />
      Install app
    </button>
  );
};

export const BackToTop = () => (
  <button
    type="button"
    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    className="inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-ink transition-colors hover:border-ink"
  >
    <ArrowUp className="h-3.5 w-3.5" />
    Back to top
  </button>
);
