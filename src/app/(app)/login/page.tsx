"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { createClient } from "@/lib/db/supabase-browser";
import { Card, Button } from "@/components/ui";
import { OnsideMark } from "@/components/ui/logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[420px] mx-auto px-6 py-20">
      <div className="flex items-center justify-center gap-2 mb-8">
        <OnsideMark size={28} />
        <span className="text-[20px] font-bold tracking-[-0.03em]">
          Onside<span className="text-up">.</span>
        </span>
      </div>
      <Card className="p-7">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-up/15 text-up grid place-items-center mx-auto mb-4">
              <Check size={22} />
            </div>
            <h1 className="display text-[22px] mb-2">Check your email</h1>
            <p className="text-[13px] text-mute leading-relaxed">
              We sent a sign-in link to <span className="text-fg num">{email}</span>. Click it to access your
              watchlist and alerts.
            </p>
          </div>
        ) : (
          <>
            <h1 className="display text-[24px] mb-1">Sign in to Onside</h1>
            <p className="text-[13px] text-mute mb-6">
              Build a watchlist, track value moves, and get alerts. No password — we&apos;ll email you a link.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <div className="flex items-center gap-2 h-11 px-3 rounded-xl bg-ink-800 border border-line focus-within:border-mute transition">
                <Mail size={15} className="text-mute-soft" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-mute-soft"
                />
              </div>
              {error && <p className="text-[12px] text-down">{error}</p>}
              <Button kind="primary" className="w-full" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Email me a sign-in link"}
              </Button>
            </form>
            <p className="text-[11px] text-mute-soft mt-4 text-center">
              By continuing you agree to our <a href="/terms" className="underline hover:text-mute">Terms</a> and{" "}
              <a href="/privacy" className="underline hover:text-mute">Privacy Policy</a>.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
