import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.maigemassage.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/book`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]
}
