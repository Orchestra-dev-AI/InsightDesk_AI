import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/ui/sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "InsightDesk AI — Command Center",
  description:
    "2026-tier Quality Orchestration Platform. Autonomous reasoning, zero-latency voice, multi-judge reliability, and self-healing QA.",
  keywords: [
    "AI",
    "Quality Orchestration",
    "Agentic",
    "WebRTC",
    "Self-Healing",
    "JRH",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} dark`}
      suppressHydrationWarning
    >
      <body 
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased"
        suppressHydrationWarning
      >
        {/* Animated mesh background */}
        <div className="mesh-bg" aria-hidden="true">
          <div className="mesh-orb-3" />
        </div>

        {/* App shell */}
        <Sidebar />
        <main className="page-content">
          {children}
        </main>
      </body>
    </html>
  );
}
