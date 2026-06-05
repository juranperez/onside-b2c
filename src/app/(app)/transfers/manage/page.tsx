import type { Metadata } from "next";
import Link from "next/link";
import { Trash2, Check } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { ConfidenceBadge } from "@/components/transfers/confidence-badge";
import { RumourForm } from "@/components/transfers/rumour-form";
import { isCurator, deleteRumour, setRumourStatus } from "@/lib/rumours/actions";
import { getRumours, getCandidates } from "@/lib/queries/rumours";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rumour curation — Onside", robots: { index: false } };

export default async function RumourManagePage() {
  if (!(await isCurator())) {
    return (
      <div className="max-w-[560px] mx-auto px-6 py-24 text-center">
        <h1 className="display text-[26px] mb-2">Curator access only</h1>
        <p className="text-mute mb-6">This page is for the Onside transfer desk. Sign in with a curator account.</p>
        <Link href="/login">
          <Button kind="primary">Sign in</Button>
        </Link>
      </div>
    );
  }

  const [rumours, candidates] = await Promise.all([getRumours(100), getCandidates(50)]);

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Transfer desk</div>
        <h1 className="display text-[28px]">Rumour curation</h1>
        <p className="text-[13px] text-mute mt-1">
          Add verified rumours from public reporting. Confidence % is computed automatically.
        </p>
      </div>

      <Card className="p-6 mb-8">
        <RumourForm />
      </Card>

      {candidates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[14px] font-semibold mb-3">Review queue ({candidates.length})</h2>
          <p className="text-[12px] text-mute-soft mb-3">Auto-ingested candidates — approve to publish (set the destination first if needed) or reject.</p>
          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-ink-850 border border-acc/20">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {c.player.name} <span className="text-mute-soft font-normal">→ {c.toClub}</span>
                  </div>
                  <div className="text-[11px] text-mute-soft truncate">{c.summary}</div>
                  <div className="text-[10.5px] text-mute-soft truncate">
                    {c.source} · tier {c.sourceTier} · {c.confidence.pct}% · auto-ingested
                  </div>
                </div>
                <form action={setRumourStatus.bind(null, c.id, "rumour")}>
                  <button className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-up/15 text-up text-[12px] font-semibold cursor-pointer">
                    <Check size={13} /> Approve
                  </button>
                </form>
                <form action={deleteRumour.bind(null, c.id)}>
                  <button className="p-2 rounded-lg text-mute-soft hover:text-down transition cursor-pointer" aria-label="Reject">
                    <Trash2 size={15} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-[14px] font-semibold mb-3">Live feed ({rumours.length})</h2>
      <div className="space-y-2">
        {rumours.length === 0 && <p className="text-[13px] text-mute-soft">No rumours yet — add the first above.</p>}
        {rumours.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-ink-850 border border-line">
            <ConfidenceBadge pct={r.confidence.pct} band={r.confidence.band} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">
                {r.player.name} → {r.toClub}
              </div>
              <div className="text-[11px] text-mute-soft truncate">
                {r.status} · {r.source} · tier {r.sourceTier}
              </div>
            </div>
            <form action={deleteRumour.bind(null, r.id)}>
              <button className="p-2 rounded-lg text-mute-soft hover:text-down transition cursor-pointer" aria-label="Delete rumour">
                <Trash2 size={15} />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
