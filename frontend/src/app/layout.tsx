import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Navbar } from '@/components/layout/navbar'
import { cn } from '@/lib/utils'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'HSG Judge — Luyện thi HSG Tin học THPT',
    template: '%s | HSG Judge',
  },
  description:
    'Nền tảng luyện thi Học sinh giỏi Tin học THPT với C++: chấm bài tự động, sơ đồ thuật toán tương tác và code khuyết theo chuẩn sư phạm.',
  applicationName: 'HSG Judge',
  keywords: ['HSG Tin học', 'C++', 'Online Judge', 'luyện thi', 'thuật toán'],
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={cn(
          'flex min-h-screen flex-col bg-background font-sans text-foreground antialiased',
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        <Providers attribute="class" defaultTheme="dark" enableSystem>
          <Navbar />
          <main className="flex flex-1 flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
