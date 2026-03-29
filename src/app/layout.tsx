import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Move&Groove — Joint Mobility',
  description: 'Evidence-Based Joint Mobility. Trusted by Elite Athletes, Crafted for You.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}