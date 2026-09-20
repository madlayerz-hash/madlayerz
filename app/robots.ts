import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing here is useful in search, and some of it is per-customer.
        disallow: ['/admin', '/admin/', '/api/', '/checkout', '/cuenta'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
