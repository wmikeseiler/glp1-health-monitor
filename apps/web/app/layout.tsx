import type { Metadata } from "next";
import { TRPCReactProvider } from "~/lib/trpc/react";

export const metadata: Metadata = {
  title: "GLP-1 Health Monitor",
  description: "Track your GLP-1 therapy, weight, vitals, food, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
