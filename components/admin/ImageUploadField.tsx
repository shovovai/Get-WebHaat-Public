"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (url: string) => void;
  /** Tailwind classes for the preview box, e.g. aspect ratio */
  previewClassName?: string;
  accept?: string;
  hint?: string;
}

/** Upload an image to Sanity (via /api/admin/uploads) or paste an image URL */
export default function ImageUploadField({ value, onChange, previewClassName, accept = "image/*", hint }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.url);
      toast.success("Image uploaded — remember to save");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-[length:16px_16px]",
          previewClassName || "h-24 w-24"
        )}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <ImagePlus className="h-6 w-6 text-gray-400" />
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 top-1 rounded-full bg-white p-1 shadow"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            Upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload(file);
            }}
          />
        </div>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL (https://)" />
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}
