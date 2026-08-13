import type { Metadata } from "next";
import { getSessionUser } from "@/lib/db/supabase-server";
import { getBoardDeals } from "@/lib/community/queries";
import { CallBoard } from "@/components/community/CallBoard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Community — call it before it happens | Onside",
  description:
    "Every live transfer with Onside's Confidence % attached. Disagree in one tap; your call locks now and scores itself when the saga settles.",
};

export default async function CommunityPage() {
  const [user, deals] = await Promise.all([
    getSessionUser().catch(() => null),
    getBoardDeals(),
  ]);

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Community</div>
        <h1 className="display text-[clamp(26px,4vw,38px)] leading-[1] tracking-[-0.04em]">
          Onside has a number. <span className="font-serif italic text-acc">Disagree with it.</span>
        </h1>
        <p className="text-mute text-[14px] mt-3 max-w-[560px] leading-relaxed">
          Every live deal carries an Onside Confidence %. Call it now — your call locks against
          that number and scores itself when the saga settles. No account needed to start.
        </p>
      </div>

      <CallBoard deals={deals} signedIn={!!user} />
    </div>
  );
}
