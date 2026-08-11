"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/db/supabase-browser";
import { Card, Button } from "@/components/ui";
import { OnsideMark } from "@/components/ui/logo";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { track } from "@/lib/analytics";

/** Supabase errors are developer-speak — translate the ones users actually hit. */
function friendlyError(message: string): string {
  if (/rate limit|too many/i.test(message)) {
    return "We're sending sign-in links as fast as we're allowed right now. Give it a minute and try again.";
  }
  if (/invalid email/i.test(message)) return "That doesn't look like a valid email address.";
  return message;
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const linkFailed = params.get("error") === "link";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, c - 1);
      });
    }, 1000);
  }

  async function send() {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const redirect = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect },
      });
      if (error) setError(friendlyError(error.message));
      else {
        setSent(true);
        startCooldown(30);
        track("magic_link_requested");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await send();
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
              We sent a sign-in link to <span className="text-fg num">{email}</span>. Open it on{" "}
              <span className="text-fg">this device</span> to access your watchlist and alerts.
            </p>
            {error && (
              <p className="text-[12px] text-down mt-3 flex items-center justify-center gap-1.5">
                <AlertCircle size={12} /> {error}
              </p>
            )}
            <p className="text-[12px] text-mute-soft mt-5">
              Didn&apos;t get it? Check spam, or{" "}
              {cooldown > 0 ? (
                <span className="num">resend in {cooldown}s</span>
              ) : (
                <button onClick={send} disabled={loading} className="text-acc hover:underline disabled:opacity-50">
                  {loading ? "sending…" : "resend the link"}
                </button>
              )}
              .
            </p>
          </div>
        ) : (
          <>
            {linkFailed && (
              <div className="mb-5 rounded-xl border border-down/30 bg-down/10 px-3.5 py-3 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-down shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-fg leading-relaxed">
                  That sign-in link didn&apos;t work — it may have expired, already been used (some email apps
                  pre-open links), or been opened in a different browser. Enter your email and we&apos;ll send a
                  fresh one.
                </p>
              </div>
            )}
            <h1 className="display text-[24px] mb-1">Sign in to Onside</h1>
            <p className="text-[13px] text-mute mb-6">
              Build a watchlist, track value moves, and get alerts. No passwords, ever.
            </p>
            <GoogleSignInButton next={next} />
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-line" />
              <span className="text-[11px] text-mute-soft uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-line" />
            </div>
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
