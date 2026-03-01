import "./globals.css";

export const metadata = {
  title: "AutoTrack",
  description: "Family vehicle mileage and maintenance tracker.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AutoTrack",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/icons/white-icon-192.png",
    apple: "/icons/white-icon-apple-touch.png"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
