import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { AnalyticsIdentity } from "@/components/layout/AnalyticsIdentity";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";
import { isWcWindow } from "@/lib/wc-window";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Server-computed once per ISR render; clients only ever see the boolean.
  const wcActive = isWcWindow(new Date());
  return (
    <>
      <AnalyticsIdentity />
      <GoogleOneTap />
      <TopNav wcActive={wcActive} />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <Footer />
    </>
  );
}
