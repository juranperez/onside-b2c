import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { isWcWindow } from "@/lib/wc-window";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const wcActive = isWcWindow(new Date());
  return (
    <>
      <TopNav wcActive={wcActive} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
