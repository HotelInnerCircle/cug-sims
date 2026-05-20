import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saboo Group — CUG Mobile Dashboard",
  description: "Manage and monitor all CUG mobile connections across HIC, RKS, and SAZ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
