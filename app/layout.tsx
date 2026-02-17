import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";
import { InspectGuard } from "@/components/InspectGuard";
import { getHomepageSettings } from "@/lib/db";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const DEFAULT_TITLE = "منصتي التعليمية | دورات وتعلم أونلاين";
const DEFAULT_DESCRIPTION = "منصة تعليمية حديثة لدورات البرمجة والتصميم والتطوير";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getHomepageSettings();
    const title = settings.pageTitle?.trim() || DEFAULT_TITLE;
    return { title, description: DEFAULT_DESCRIPTION };
  } catch {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let platformName: string | null = null;
  try {
    const settings = await getHomepageSettings();
    platformName = settings.platformName;
  } catch {
    // استخدام الافتراضي في الهيدر
  }
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");document.documentElement.classList.add(t==="light"?"light":"dark");})();`,
          }}
        />
      </head>
      <body className={`${outfit.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <NextTopLoader
          color="#0d9488"
          height={3}
          showSpinner={false}
          easing="ease"
          speed={300}
          shadow="0 0 10px rgba(13,148,136,0.4)"
        />
        <SessionProvider>
          <InspectGuard />
          <Header platformName={platformName} />
          <main className="flex-1">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
