import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { AnalyticsIdentity } from "@/components/layout/AnalyticsIdentity";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsIdentity />
      <TopNav />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <Footer />
    </>
  );
}
