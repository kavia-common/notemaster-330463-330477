import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoteMaster",
  description: "A lightweight notes app (static-export compatible) with tags and search.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
