import React from "react";
import Script from "next/script";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Script
          src="https://www.gstatic.com/charts/loader.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
