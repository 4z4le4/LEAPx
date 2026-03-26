import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEAPx-Backend",
  description: "LEAPx : Learning & Experience Advancement Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
