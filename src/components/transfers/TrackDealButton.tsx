"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, BellPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFollowRumour } from "@/lib/rumours/follow-actions";

/** Follow a saga → in-app alert on every development (signed-out users get sent to login). */
export function TrackDealButton({ rumourId, initialFollowing }: { rumourId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          const r = await toggleFollowRumour(rumourId);
          if ("error" in r) {
            if (r.error === "not-signed-in") router.push("/login");
            return;
          }
          setFollowing(r.following);
        });
      }}
      title={following ? "Tracking — you'll be alerted on every development" : "Track this deal"}
      className={cn(
        "inline-flex items-center gap-1 transition cursor-pointer",
        following ? "text-acc" : "text-mute hover:text-acc",
      )}
    >
      {following ? <BellRing size={11} /> : <BellPlus size={11} />}
      <span className="text-[10.5px] font-medium">{following ? "Tracking" : "Track"}</span>
    </button>
  );
}
