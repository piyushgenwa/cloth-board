import type { ScrapedData } from "../types";

/**
 * API endpoints to try in order:
 * 1. Relative /api/scrape - works on Vercel (serverless function)
 * 2. localhost:3001 - works in local dev (Express server)
 */
const API_ENDPOINTS = ["/api/scrape", "http://localhost:3001/api/scrape"];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  // Try each API endpoint (Vercel serverless first, then local Express)
  for (const endpoint of API_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
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
      // This endpoint not available, try next
    }
  }

  // Final fallback when no backend is reachable
  return {
    title: extractDomain(url) + " Item",
    price: "Price not found",
    currency: "USD",
    imageUrl: "",
    store: extractDomain(url),
    sizes: [],
    colors: [],
    description:
      "Could not fetch details. Make sure the scraper server is running (npm run dev).",
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
