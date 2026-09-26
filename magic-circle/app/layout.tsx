import type { Metadata } from "next";
import "./globals.css";
import { WebMcp } from "./webmcp";

export const metadata: Metadata = {
  title: "The Sixfold Circle",
  description: "Six seals awaken one shared magic circle.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}<WebMcp /></body>
    </html>
  );
}
