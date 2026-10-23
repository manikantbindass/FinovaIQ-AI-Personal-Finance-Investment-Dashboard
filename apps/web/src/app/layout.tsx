import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "FinovaIQ · Your Financial Command Center",
  description:
    "Understand your money, track your goals, and make informed decisions with FinovaIQ.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
