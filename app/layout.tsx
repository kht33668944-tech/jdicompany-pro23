import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "업무 관리 시스템",
  description: "직원 업무 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
