import type { ScrapedData } from "../types";

/**
 * Client-side link parser that extracts Open Graph and meta tags from URLs.
 * For a production app, this would be a backend service using Puppeteer/Playwright.
 * This implementation uses a CORS proxy approach for demo purposes.
 */

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}

function extractFromHtml(html: string, url: string): ScrapedData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const getMeta = (property: string): string => {
    const el =
      doc.querySelector(`meta[property="${property}"]`) ||
      doc.querySelector(`meta[name="${property}"]`);
    return el?.getAttribute("content") || "";
  };

  const title =
    getMeta("og:title") ||
    getMeta("twitter:title") ||
    doc.querySelector("title")?.textContent ||
    "Untitled Item";

  const imageUrl =
    getMeta("og:image") ||
    getMeta("twitter:image") ||
    doc.querySelector('link[rel="image_src"]')?.getAttribute("href") ||
    "";

  const description =
    getMeta("og:description") ||
    getMeta("description") ||
    getMeta("twitter:description") ||
    "";

  // Try to extract price from structured data or common patterns
  let price = "";
  const pricePatterns = [
    /\$[\d,]+\.?\d*/,
    /€[\d,]+\.?\d*/,
    /£[\d,]+\.?\d*/,
    /USD\s*[\d,]+\.?\d*/,
    /EUR\s*[\d,]+\.?\d*/,
  ];

  const jsonLdScripts = doc.querySelectorAll(
    'script[type="application/ld+json"]'
  );
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || "");
      if (data.offers?.price) {
        price = String(data.offers.price);
        break;
      }
      if (data["@graph"]) {
        for (const item of data["@graph"]) {
          if (item.offers?.price) {
            price = String(item.offers.price);
            break;
          }
        }
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  if (!price) {
    const bodyText = doc.body?.textContent || "";
    for (const pattern of pricePatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        price = match[0];
        break;
      }
    }
  }

  const currency = price.startsWith("€")
    ? "EUR"
    : price.startsWith("£")
      ? "GBP"
      : "USD";

  return {
    title: title.trim(),
    price: price || "Price not found",
    currency,
    imageUrl,
    store: extractDomain(url),
    sizes: [],
    colors: [],
    description: description.trim(),
  };
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  // Try fetching via a CORS proxy for client-side scraping
  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of corsProxies) {
    try {
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const html = await response.text();
        return extractFromHtml(html, url);
      }
    } catch {
      // try next proxy
    }
  }

  // Fallback: return basic data from the URL itself
  return {
    title: extractDomain(url) + " Item",
    price: "Price not found",
    currency: "USD",
    imageUrl: "",
    store: extractDomain(url),
    sizes: [],
    colors: [],
    description: "Could not fetch details. Click to visit the product page.",
  };
}

/**
 * Create a manual item when URL scraping isn't needed
 */
export function createManualItem(
  title: string,
  imageUrl: string,
  price: string
): ScrapedData {
  return {
    title,
    price,
    currency: "USD",
    imageUrl,
    store: "Manual",
    sizes: [],
    colors: [],
    description: "",
  };
}
