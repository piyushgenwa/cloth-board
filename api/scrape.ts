import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as cheerio from "cheerio";

interface ScrapedData {
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  store: string;
  sizes: string[];
  colors: string[];
  description: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}

function resolveUrl(base: string, relative: string): string {
  if (!relative) return "";
  if (relative.startsWith("http")) return relative;
  if (relative.startsWith("//")) return "https:" + relative;
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function extractFromHtml(html: string, url: string): ScrapedData {
  const $ = cheerio.load(html);

  const getMeta = (attr: string): string => {
    return (
      $(`meta[property="${attr}"]`).attr("content") ||
      $(`meta[name="${attr}"]`).attr("content") ||
      ""
    );
  };

  // Title
  const title =
    getMeta("og:title") ||
    getMeta("twitter:title") ||
    getMeta("product:title") ||
    $("h1.product-title").text().trim() ||
    $("h1.product_title").text().trim() ||
    $("h1[class*='product']").first().text().trim() ||
    $("h1[class*='name']").first().text().trim() ||
    $('[data-testid="product-title"]').text().trim() ||
    $('[class*="product-name"]').first().text().trim() ||
    $('[class*="product-title"]').first().text().trim() ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled Item";

  // Image
  let imageUrl =
    getMeta("og:image") ||
    getMeta("og:image:secure_url") ||
    getMeta("twitter:image") ||
    getMeta("twitter:image:src") ||
    getMeta("product:image") ||
    "";

  if (!imageUrl) {
    const imgSelectors = [
      '[class*="product-image"] img',
      '[class*="product-gallery"] img',
      '[class*="product_image"] img',
      '[data-testid*="image"] img',
      '[class*="woocommerce-product-gallery"] img',
      ".gallery-image img",
      "#product-image img",
      ".product img",
      'img[class*="product"]',
      "main img",
    ];
    for (const selector of imgSelectors) {
      const img = $(selector).first();
      const src =
        img.attr("src") ||
        img.attr("data-src") ||
        img.attr("data-lazy-src") ||
        img.attr("data-original");
      if (src && !src.includes("placeholder") && !src.includes("spinner")) {
        imageUrl = src;
        break;
      }
    }
  }

  imageUrl = resolveUrl(url, imageUrl);

  // Price
  let price = "";
  let currency = "USD";

  // 1. Product meta tags
  const metaPrice =
    getMeta("product:price:amount") ||
    getMeta("og:price:amount") ||
    getMeta("product:price") ||
    getMeta("og:price");
  const metaCurrency =
    getMeta("product:price:currency") ||
    getMeta("og:price:currency") ||
    "";

  if (metaPrice) {
    price = metaPrice;
    if (metaCurrency) currency = metaCurrency;
  }

  // 2. JSON-LD structured data
  if (!price) {
    $('script[type="application/ld+json"]').each((_, el) => {
      if (price) return;
      try {
        const data = JSON.parse($(el).html() || "");
        const extractPrice = (obj: any): void => {
          if (price) return;
          if (!obj || typeof obj !== "object") return;

          if (obj.offers) {
            const offers = Array.isArray(obj.offers)
              ? obj.offers
              : [obj.offers];
            for (const offer of offers) {
              if (offer.price) {
                price = String(offer.price);
                currency = offer.priceCurrency || currency;
                return;
              }
              if (offer.lowPrice) {
                price = String(offer.lowPrice);
                currency = offer.priceCurrency || currency;
                return;
              }
            }
          }

          if (obj["@graph"] && Array.isArray(obj["@graph"])) {
            for (const item of obj["@graph"]) {
              extractPrice(item);
              if (price) return;
            }
          }
        };
        extractPrice(data);
      } catch {
        // ignore
      }
    });
  }

  // 3. DOM price selectors
  if (!price) {
    const priceSelectors = [
      '[class*="price"] .amount',
      '[class*="price"]:not([class*="old"]):not([class*="was"]):not([class*="original"])',
      '[data-testid*="price"]',
      '[class*="product-price"]',
      '[class*="product_price"]',
      '[class*="current-price"]',
      '[class*="sale-price"]',
      '[class*="selling-price"]',
      ".price",
      "#price",
      '[itemprop="price"]',
    ];

    for (const selector of priceSelectors) {
      const el = $(selector).first();
      const text = el.attr("content") || el.text().trim();
      if (text) {
        const priceMatch = text.match(
          /[\$\€\£\₹]?\s?[\d,]+\.?\d*|[\d,]+\.?\d*\s?(?:USD|EUR|GBP|INR|₹)/
        );
        if (priceMatch) {
          price = priceMatch[0].trim();
          break;
        }
      }
    }
  }

  // 4. Microdata
  if (!price) {
    const priceEl = $('[itemprop="price"]');
    if (priceEl.length) {
      price = priceEl.attr("content") || priceEl.text().trim();
      const currencyEl = $('[itemprop="priceCurrency"]');
      if (currencyEl.length) {
        currency =
          currencyEl.attr("content") || currencyEl.text().trim() || currency;
      }
    }
  }

  // Add currency symbol if missing
  if (price && !price.match(/[\$\€\£\₹]/)) {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
    };
    price = (symbols[currency] || currency + " ") + price;
  }

  // Description
  const description =
    getMeta("og:description") ||
    getMeta("description") ||
    getMeta("twitter:description") ||
    "";

  // Sizes
  const sizes: string[] = [];
  $(
    '[class*="size"] button, [class*="size"] option, [data-testid*="size"]'
  ).each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 10 && !sizes.includes(text)) {
      sizes.push(text);
    }
  });

  return {
    title: title.substring(0, 200),
    price: price || "Price not found",
    currency,
    imageUrl,
    store: extractDomain(url),
    sizes: sizes.slice(0, 20),
    colors: [],
    description: description.substring(0, 500),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const data = extractFromHtml(html, url);

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: "Failed to fetch URL",
      details: err.message,
      fallback: {
        title: extractDomain(url) + " Item",
        price: "Price not found",
        currency: "USD",
        imageUrl: "",
        store: extractDomain(url),
        sizes: [],
        colors: [],
        description:
          "Could not fetch details. Click to visit the product page.",
      },
    });
  }
}
