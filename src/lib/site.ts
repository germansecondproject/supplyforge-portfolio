/** The public address of the store, for canonical URLs, the sitemap and robots.txt. Netlify sets URL to the main site. */
export const SITE_URL = (process.env.URL || 'https://supplyforge.netlify.app').replace(/\/$/, '');
