import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book a Massage in Ponca City',
  description:
    'Schedule your massage appointment with MaiGem Massage in Ponca City, Oklahoma. Choose from back, full body, or 2-hour Ultimate Relaxation sessions. Easy online booking.',
  openGraph: {
    title: 'Book a Massage in Ponca City | MaiGem Massage',
    description:
      'Schedule your massage appointment with MaiGem Massage in Ponca City, Oklahoma. Easy online booking, by appointment only.',
    url: 'https://www.maigemassage.com/book',
  },
  alternates: {
    canonical: 'https://www.maigemassage.com/book',
  },
}

export default function BookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
