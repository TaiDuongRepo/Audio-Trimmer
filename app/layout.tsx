import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Audio Trimmer - Cắt và chỉnh sửa audio online",
  description: "Ứng dụng web để cắt, trim và chỉnh sửa file audio với giao diện thân thiện",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

