# SEO Checklist — ShifoYo'l Landing

Use this checklist when adding **new HTML pages** to the project.

## 1. `<head>` — Required Meta Tags

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page Title | ShifoYo'l — Клиники Ташкента</title>
<meta name="description" content="150–160 char description with keywords.">
<meta name="keywords" content="shifoyol, клиники ташкента, relevant, keywords">
<link rel="canonical" href="https://shifoyol.uz/your-page.html">
<link rel="icon" type="image/x-icon" href="public/favicon.ico">
<meta name="theme-color" content="#2563eb">
```

## 2. Open Graph (Social Sharing)

```html
<meta property="og:type" content="website">
<meta property="og:url" content="https://shifoyol.uz/your-page.html">
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Short description for social share.">
<meta property="og:site_name" content="ShifoYo'l">
<meta property="og:image" content="https://shifoyol.uz/images/your-image.png">
<meta property="og:image:alt" content="Image description">
```

## 3. Twitter Card

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Page Title">
<meta name="twitter:description" content="Short description.">
<meta name="twitter:image" content="https://shifoyol.uz/images/your-image.png">
```

## 4. Content

- [ ] Exactly **one `<h1>`** per page (main title)
- [ ] Logical heading order: h1 → h2 → h3
- [ ] All images have meaningful `alt` text
- [ ] Use `loading="lazy"` for below-fold images

## 5. Sitemap

Add new page to `sitemap.xml`:

```xml
<url>
  <loc>https://shifoyol.uz/your-page.html</loc>
  <lastmod>YYYY-MM-DD</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

## 6. Internal Links

- [ ] Link to new page from index.html or footer
- [ ] Link back to index.html from new page

## 7. Schema.org (Optional, for special pages)

For clinic/doctor listing pages, add JSON-LD:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "ShifoYo'l",
  "url": "https://shifoyol.uz"
}
</script>
```

## Target Keywords (ShifoYo'l)

- shifoyol, shifo, клиника, клиники ташкента
- частная клиника ташкент, лучшие клиники ташкента
- dental clinic, зубная клиника, medical center
- family clinic, глазная клиника, лор клиника
- анализ, номер клиники, doctor tashkent
- klinika 24/7, klinikalar, doctor uz
