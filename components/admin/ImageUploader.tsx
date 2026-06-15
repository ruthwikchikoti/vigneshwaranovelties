"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { ikImage } from "@/lib/imagekit";

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
};

export function ImageUploader({ urls, onChange, max = 6 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    setError(null);
    setUploading(true);
    try {
      // Compress + upload every selected photo concurrently — much faster than
      // one-at-a-time. Promise.all preserves order, so the first photo stays the
      // cover.
      const slice = Array.from(files).slice(0, max - urls.length);
      const accepted = await Promise.all(
        slice.map(async (file) => {
          const compressed = await imageCompression(file, {
            maxSizeMB: 1.2,
            maxWidthOrHeight: 1800,
            useWebWorker: true,
            fileType: "image/webp",
          });
          const formData = new FormData();
          formData.append("file", compressed, file.name.replace(/\.[^.]+$/, ".webp"));
          const res = await fetch("/api/admin/upload-image", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Upload failed");
          }
          const { url } = await res.json();
          return url as string;
        })
      );
      onChange([...urls, ...accepted]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (idx: number) => {
    onChange(urls.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {/* No `capture` attribute → mobile shows the Gallery / Camera / Files
          chooser instead of forcing the camera. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {urls.map((url, i) => (
          <div key={url + i} className="relative aspect-square bg-mist border border-ink/10 group">
            <Image
              src={ikImage(url, { width: 300 })}
              alt=""
              fill
              sizes="200px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-6 h-6 bg-ink/80 text-ivory grid place-items-center text-xs hover:bg-cognac"
              aria-label="Remove"
            >
              ×
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 smallcaps text-[0.5rem] bg-champagne text-ink px-1.5 py-0.5">
                Cover
              </span>
            )}
          </div>
        ))}
        {urls.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square border-2 border-dashed border-ink/25 hover:border-ink hover:bg-ink/5 transition-colors flex flex-col items-center justify-center gap-1 text-ink/60"
          >
            {uploading ? (
              <span className="text-[0.6rem] smallcaps">Uploading…</span>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-[0.55rem] smallcaps">+ Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-cognac text-xs mt-2">{error}</p>}
      <p className="text-xs text-ink/50 mt-2">
        First photo is the cover. {urls.length}/{max} added.
      </p>
    </div>
  );
}
