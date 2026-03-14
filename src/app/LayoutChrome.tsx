"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function LayoutChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideChrome = pathname === "/countdown-tasks/focus";

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      {!hideChrome ? (
        <div style={{ width: "100%", padding: "12px 24px 0" }}>
          <Header />
        </div>
      ) : null}

      <main className="flex-1 bg-white dark:bg-black">{children}</main>

      {!hideChrome ? (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 24px" }}>
          <Footer />
        </div>
      ) : null}
    </div>
  );
}