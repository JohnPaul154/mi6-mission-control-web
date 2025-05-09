import type { Metadata } from "next";
import { Open_Sans } from 'next/font/google';
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner"
import { SessionProvider } from "@/contexts/SessionContext";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '800'],
  style: ['normal', 'italic'], // Ensure both normal and italic are included
});

export const metadata: Metadata = {
  title: "MI6 Command Center"
};

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${openSans.className} text-[1.25rem]`}
        style={{ backgroundColor: '#e5e7eb' }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
