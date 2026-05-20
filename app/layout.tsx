import type { Metadata } from "next";
import "./globals.css";
import ThemeRouteSync from "./ThemeRouteSync";

export const metadata: Metadata = {
  title: "Parallel — AI叙事世界引擎",
  description: "A living narrative world engine with AI showrunner, dynamic characters, memory, and evolving world state",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("parallel-theme")==="day"?"day":"night";document.documentElement.dataset.theme=t;document.documentElement.classList.toggle("theme-day",t==="day");document.documentElement.classList.toggle("theme-night",t==="night")}catch(e){document.documentElement.dataset.theme="night";document.documentElement.classList.add("theme-night")}`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased noise-bg">
        <ThemeRouteSync />
        {children}
      </body>
    </html>
  );
}
