import type { Metadata, Viewport } from "next";
import { Fira_Code, Space_Grotesk } from "next/font/google";
import RegisterPWA from "./register-pwa";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  applicationName: "TestLoc Compass",
  title: "TestLoc Compass PWA",
  description:
    "PWA la bàn thời gian thực với thông tin thiết bị, vị trí, DeviceMotion và Bluetooth RSSI.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "TestLoc Compass",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${spaceGrotesk.variable} ${firaCode.variable}`}>
        <RegisterPWA />
        {children}
      </body>
    </html>
  );
}
