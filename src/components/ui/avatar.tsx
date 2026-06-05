"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  clubBg?: string;
  clubColor?: string;
  size?: number;
  ring?: boolean;
  src?: string | null; // player headshot URL — falls back to initials on error
}

export function Avatar({ name, clubBg = "#333", clubColor = "#fff", size = 40, ring = false, src }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const showPhoto = Boolean(src && !imgFailed);

  const parts = name.split(" ");
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: `linear-gradient(135deg, ${clubBg} 0%, ${clubColor} 140%)`,
      }}
      className={cn(
        "relative shrink-0 rounded-full grid place-items-center font-semibold tracking-tight overflow-hidden",
        ring && "ring-2 ring-overlay/10"
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          width={size}
          height={size}
          className="absolute inset-0 w-full h-full object-cover object-top"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      ) : (
        <>
          <span className="text-fg drop-shadow-sm">{initials}</span>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 55%)" }}
          />
        </>
      )}
    </div>
  );
}
