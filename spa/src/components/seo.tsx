interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

// React 19 hoists <title>/<meta>/<link> rendered anywhere in the tree into
// <head>, both client-side and during prerendering — no Helmet needed.
export function SEO({
  title,
  description,
  image,
  url,
  type = 'website'
}: SEOProps) {
  const siteName = 'Jonathan Yates';
  const fullTitle = title && title !== siteName ? `${title} | ${siteName}` : siteName;
  const defaultDescription = 'Software Development Engineer at Amazon. Passionate about software development, cloud technologies, and continuous learning.';
  const metaDescription = description || defaultDescription;
  const siteUrl = 'https://jyates.dev';
  const fullUrl = url ? (url.startsWith('http') ? url : `${siteUrl}${url}`) : siteUrl;
  const ogImage = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : `${siteUrl}/images/og/default.png`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />

      {/* Open Graph */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title || siteName} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      <link rel="canonical" href={fullUrl} />
    </>
  );
}
