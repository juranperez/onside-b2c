import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <Footer />
    </>
  );
}
