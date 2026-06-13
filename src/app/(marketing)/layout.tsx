import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { isWcWindow } from "@/lib/wc-window";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const wcActive = isWcWindow(new Date());
  return (
    <>
      <TopNav wcActive={wcActive} />
      <main className="pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <Footer />
      <BottomNav wcActive={wcActive} />
    </>
  );
}
