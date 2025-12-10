import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Automation | Hyperbrowser",
  description: "AI-powered job search and application automation using Claude Computer Use",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen">
          {/* Navigation */}
          <nav className="border-b border-[var(--border)] bg-[var(--card)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-8">
                  <h1 className="text-xl font-bold text-white">
                    🤖 Job Automation
                  </h1>
                  <div className="hidden md:flex items-center gap-4">
                    <Link
                      href="/"
                      className="text-[var(--muted)] hover:text-white transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/jobs"
                      className="text-[var(--muted)] hover:text-white transition-colors"
                    >
                      Jobs
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[var(--muted)]">
                    Powered by Hyperbrowser
                  </span>
                </div>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

