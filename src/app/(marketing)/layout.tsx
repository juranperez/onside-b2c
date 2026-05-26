import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
