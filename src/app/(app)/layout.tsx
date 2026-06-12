import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { AnalyticsIdentity } from "@/components/layout/AnalyticsIdentity";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsIdentity />
      <GoogleOneTap />
      <TopNav />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <Footer />
    </>
  );
}
