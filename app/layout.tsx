import type { Metadata } from "next";
import "./globals.css";
import { poppins } from "./fonts";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";
import { AppShell } from "@/components/AppShell";

const title = "DreamCollege.ai — College & Career Planning";
const description = "Map your path from self-discovery to your dream college — career fit, best-fit majors, a calibrated college list, and an admissions evaluation built around you.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "DreamCollege.ai",
  keywords: ["college planning", "career discovery", "college list", "admissions evaluation", "scholarships", "major finder"],
  openGraph: {
    title,
    description,
    siteName: "DreamCollege.ai",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0eeff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0a2e" },
  ],
};

const noFlash = `(function(){try{var t=localStorage.getItem('dc.theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body className={poppins.variable}>
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
