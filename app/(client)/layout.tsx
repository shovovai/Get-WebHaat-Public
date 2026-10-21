import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";
import BottomNav from "@/components/layout/BottomNav";
import FloatingActions from "@/components/layout/FloatingActions";
import "../globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      {children}
      <Footer />
      {/* Space for the bottom tab bar on phones/tablets */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] bg-black lg:hidden" />
      <BottomNav />
      <FloatingActions />
    </>
  );
}
