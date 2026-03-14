import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutChrome from "./LayoutChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.event-clocks.com"),
  title: "Event Clocks",
  description:
    "Simple tools for planning events, meetings, and schedules across time zones.",
  alternates: {
    canonical: "https://www.event-clocks.com/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-B2HX3GQVYF"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-B2HX3GQVYF');
          `}
        </Script>
        {/* <Script
          id="adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8550123052003634"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        /> */}
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20">
          <div className="absolute inset-0 bg-white dark:bg-black" />
          <div className="absolute -top-40 left-1/2 h-[32rem] w-[60rem] -translate-x-1/2 rounded-full bg-violet-200/15 blur-3xl dark:bg-violet-500/8" />
          <div className="absolute top-24 -left-40 h-[26rem] w-[26rem] rounded-full bg-sky-200/12 blur-3xl dark:bg-sky-500/8" />
          <div className="absolute top-72 -right-40 h-[26rem] w-[26rem] rounded-full bg-emerald-200/12 blur-3xl dark:bg-emerald-500/8" />
        </div>

        <LayoutChrome>{children}</LayoutChrome>
      </body>
    </html>
  );
}