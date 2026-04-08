import { useEffect } from 'react';

const SITE_NAME = 'BuzzForge';

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    Object.keys(attributes).forEach((key) => {
      if (key !== 'content') {
        element.setAttribute(key, attributes[key]);
      }
    });
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
};

const upsertLink = (rel, href) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
};

function Seo({ title, description, path = '/', type = 'website', noIndex = false, jsonLd = null }) {
  useEffect(() => {
    const absoluteUrl = new URL(path, window.location.origin).toString();
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const pageDescription = description || 'A social publishing platform for quick thoughts, deep dives, and community conversation.';

    document.title = pageTitle;
    upsertMeta('meta[name="description"]', { name: 'description', content: pageDescription });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: pageTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: pageDescription });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: absoluteUrl });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: pageTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: pageDescription });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noIndex ? 'noindex,nofollow' : 'index,follow'
    });
    upsertLink('canonical', absoluteUrl);

    const scriptId = 'seo-json-ld';
    const existingScript = document.getElementById(scriptId);

    if (jsonLd) {
      const nextScript = existingScript || document.createElement('script');
      nextScript.id = scriptId;
      nextScript.type = 'application/ld+json';
      nextScript.text = JSON.stringify(jsonLd);
      if (!existingScript) {
        document.head.appendChild(nextScript);
      }
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [description, jsonLd, noIndex, path, title, type]);

  return null;
}

export default Seo;