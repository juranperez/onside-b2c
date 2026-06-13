import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { AnalyticsIdentity } from "@/components/layout/AnalyticsIdentity";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";
import { isWcWindow } from "@/lib/wc-window";
import { LiveTicker } from "@/components/layout/LiveTicker";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Server-computed once per ISR render; clients only ever see the boolean.
  const wcActive = isWcWindow(new Date());
  return (
    <>
      <AnalyticsIdentity />
      <GoogleOneTap />
      <TopNav wcActive={wcActive} />
      {wcActive && <LiveTicker />}
      <main className="min-h-[calc(100vh-56px)] pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <Footer />
      <BottomNav wcActive={wcActive} />
    </>
  );
}
