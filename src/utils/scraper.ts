import type { ScrapedData } from "../types";

const API_BASE = "http://localhost:3001";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  // Try the backend API first (server-side scraping, no CORS issues)
  try {
    const response = await fetch(`${API_BASE}/api/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) {
      return await response.json();
    }

    // If server returned an error with a fallback, use it
    const errorData = await response.json().catch(() => null);
    if (errorData?.fallback) {
      return errorData.fallback;
    }
  } catch {
    // Backend not available, fall through to client-side attempt
  }

  // Fallback: try client-side CORS proxies
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

  // Final fallback
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

/** Client-side HTML extraction fallback */
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
    getMeta("og:image:secure_url") ||
    getMeta("twitter:image") ||
    "";

  const description =
    getMeta("og:description") ||
    getMeta("description") ||
    "";

  // Price extraction
  let price = "";
  let currency = "USD";

  // Try product meta tags
  const metaPrice =
    getMeta("product:price:amount") || getMeta("og:price:amount") || "";
  if (metaPrice) {
    price = metaPrice;
    currency = getMeta("product:price:currency") || "USD";
  }

  // Try JSON-LD
  if (!price) {
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent || "");
        if (data.offers?.price) {
          price = String(data.offers.price);
          currency = data.offers?.priceCurrency || currency;
          break;
        }
        if (data["@graph"]) {
          for (const item of data["@graph"]) {
            if (item.offers?.price) {
              price = String(item.offers.price);
              currency = item.offers?.priceCurrency || currency;
              break;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Format price with currency symbol
  if (price && !price.match(/[\$\€\£\₹]/)) {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹" };
    price = (symbols[currency] || currency + " ") + price;
  }

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
