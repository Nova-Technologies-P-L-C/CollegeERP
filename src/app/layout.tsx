import type { Metadata } from 'next'
import { ClerkProvider } from '@/context/SanctumAuthContext'
import { Outfit } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme-provider'
import './globals.css'

const outfit = Outfit({
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Nova Technology — College ERP Portal',
  description:
    'A centralized web-based ERP platform by Nova Technology to streamline administrative and academic tasks for students, faculty, and administrators.',
  icons: {
    icon: '/collegelogo.png',
    shortcut: '/collegelogo.png',
    apple: '/collegelogo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'var(--brand-primary)',
          colorTextOnPrimaryBackground: 'var(--primary-foreground)',
          colorBackground: 'var(--background)',
          colorText: 'var(--foreground)',
          colorInputBackground: 'var(--background)',
          colorInputText: 'var(--foreground)',
          borderRadius: '0px',
        },
        elements: {
          card: 'rounded-none border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] bg-card text-card-foreground',
          formButtonPrimary: 'rounded-none border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all bg-primary text-primary-foreground',
          formFieldInput: 'rounded-none border-2 border-border focus:ring-0 focus:border-primary bg-background text-foreground',
        }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${outfit.variable} font-sans antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange={false}
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}