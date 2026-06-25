import type { Metadata } from "next";
import "./globals.css";
import { fraunces, hanken, splineMono } from "./fonts";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "DreamCollege.ai — College & Career Planning",
  description: "Map your path from self-discovery to your dream college.",
};

const noFlash = `(function(){try{var t=localStorage.getItem('dc.theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body className={`${fraunces.variable} ${hanken.variable} ${splineMono.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              <AppShell>{children}</AppShell>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
