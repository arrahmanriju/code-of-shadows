import type { Metadata } from 'next';
import './globals.css';
import './panel-actions.css';
import { brandVersion } from '@/lib/brand';
export function generateMetadata(): Metadata {
  return {title:'CODE OF SHADOWS — Azizur Rahman',description:'Where code meets the dark. Explore the software, AI/ML work, and competitive programming journey of Azizur Rahman.',icons:{icon:[{url:`/favicon.svg?v=${brandVersion()}`,type:'image/svg+xml'}]}};
}
export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="en">
      {/* Extensions can inject body attributes such as cz-shortcut-listen before hydration.
          Suppress only this element's mismatch; descendants retain hydration checks. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

