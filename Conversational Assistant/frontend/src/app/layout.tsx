import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conversational Assistant",
  description: "AI Assistant with Tools using LM Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
