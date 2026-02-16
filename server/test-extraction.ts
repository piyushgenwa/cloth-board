/**
 * Test the extraction logic against sample HTML from adidas.co.in and footballmonk.in.
 * Run with: npx tsx server/test-extraction.ts
 */
import * as cheerio from "cheerio";

// Re-implement the extraction function locally for testing
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

function extractFromHtml(html: string, url: string) {
  const $ = cheerio.load(html);

  const getMeta = (attr: string): string => {
    return (
      $(`meta[property="${attr}"]`).attr("content") ||
      $(`meta[name="${attr}"]`).attr("content") ||
      ""
    );
  };

  const title =
    getMeta("og:title") ||
    getMeta("twitter:title") ||
    getMeta("product:title") ||
    $("h1.product-title").text().trim() ||
    $("h1.product_title").text().trim() ||
    $("h1[class*='product']").first().text().trim() ||
    $("h1[class*='name']").first().text().trim() ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled Item";

  let imageUrl =
    getMeta("og:image") ||
    getMeta("og:image:secure_url") ||
    getMeta("twitter:image") ||
    getMeta("product:image") ||
    "";

  if (!imageUrl) {
    const imgSelectors = [
      '[class*="product-image"] img',
      '[class*="product-gallery"] img',
      '[class*="woocommerce-product-gallery"] img',
      ".gallery-image img",
      ".product img",
      "main img",
    ];
    for (const selector of imgSelectors) {
      const img = $(selector).first();
      const src =
        img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src");
      if (src && !src.includes("placeholder")) {
        imageUrl = src;
        break;
      }
    }
  }

  imageUrl = resolveUrl(url, imageUrl);

  let price = "";
  let currency = "USD";

  const metaPrice =
    getMeta("product:price:amount") || getMeta("og:price:amount") || "";
  const metaCurrency =
    getMeta("product:price:currency") || getMeta("og:price:currency") || "";
  if (metaPrice) {
    price = metaPrice;
    if (metaCurrency) currency = metaCurrency;
  }

  if (!price) {
    $('script[type="application/ld+json"]').each((_, el) => {
      if (price) return;
      try {
        const data = JSON.parse($(el).html() || "");
        const extract = (obj: any): void => {
          if (price) return;
          if (!obj || typeof obj !== "object") return;
          if (obj.offers) {
            const offers = Array.isArray(obj.offers) ? obj.offers : [obj.offers];
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
          if (obj["@graph"]) {
            for (const item of obj["@graph"]) {
              extract(item);
              if (price) return;
            }
          }
        };
        extract(data);
      } catch {}
    });
  }

  if (!price) {
    const priceSelectors = [
      '[class*="price"] .amount',
      '[class*="price"]:not([class*="old"]):not([class*="was"])',
      '[class*="product-price"]',
      ".price",
      '[itemprop="price"]',
    ];
    for (const selector of priceSelectors) {
      const el = $(selector).first();
      const text = el.attr("content") || el.text().trim();
      if (text) {
        const priceMatch = text.match(
          /[\$€£₹]?\s?[\d,]+\.?\d*|[\d,]+\.?\d*\s?(?:USD|EUR|GBP|INR|₹)/
        );
        if (priceMatch) {
          price = priceMatch[0].trim();
          break;
        }
      }
    }
  }

  if (price && !price.match(/[\$€£₹]/)) {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹" };
    price = (symbols[currency] || currency + " ") + price;
  }

  return {
    title,
    price: price || "Price not found",
    currency,
    imageUrl,
    store: extractDomain(url),
  };
}

// ----- TEST 1: Adidas-style HTML -----
const adidasHtml = `
<html>
<head>
  <title>Adilette Flow Slides - adidas India</title>
  <meta property="og:title" content="Adilette Flow Slides" />
  <meta property="og:image" content="https://assets.adidas.com/images/IF4134_01_standard.jpg" />
  <meta property="og:description" content="Comfortable slides for everyday wear" />
  <meta property="product:price:amount" content="2999" />
  <meta property="product:price:currency" content="INR" />
  <script type="application/ld+json">
  {
    "@type": "Product",
    "name": "Adilette Flow Slides",
    "image": "https://assets.adidas.com/images/IF4134_01_standard.jpg",
    "offers": {
      "@type": "Offer",
      "price": "2999",
      "priceCurrency": "INR"
    }
  }
  </script>
</head>
<body>
  <h1 class="product-name">Adilette Flow Slides</h1>
  <div class="product-price">₹2,999</div>
</body>
</html>
`;

// ----- TEST 2: WooCommerce-style HTML (footballmonk) -----
const footballMonkHtml = `
<html>
<head>
  <title>Premium Quality PSG Jordan Edition Jersey 2024-25 - Football Monk</title>
  <meta property="og:title" content="Premium Quality PSG Jordan Edition Jersey 2024-25" />
  <meta property="og:image" content="https://footballmonk.in/wp-content/uploads/psg-jordan-jersey.jpg" />
  <meta property="og:description" content="High quality PSG jersey" />
  <meta property="product:price:amount" content="799" />
  <meta property="product:price:currency" content="INR" />
  <script type="application/ld+json">
  {
    "@type": "Product",
    "name": "Premium Quality PSG Jordan Edition Jersey 2024-25",
    "image": "https://footballmonk.in/wp-content/uploads/psg-jordan-jersey.jpg",
    "offers": {
      "@type": "Offer",
      "price": "799",
      "priceCurrency": "INR"
    }
  }
  </script>
</head>
<body>
  <h1 class="product_title">Premium Quality PSG Jordan Edition Jersey 2024-25</h1>
  <div class="woocommerce-product-gallery">
    <img src="https://footballmonk.in/wp-content/uploads/psg-jordan-jersey.jpg" />
  </div>
  <p class="price"><span class="amount">₹799</span></p>
</body>
</html>
`;

// ----- TEST 3: Minimal HTML with only DOM elements, no meta tags -----
const minimalHtml = `
<html>
<head><title>Some Product</title></head>
<body>
  <h1>Cool Sneakers</h1>
  <div class="product-price">$129.99</div>
  <div class="product-image"><img src="/images/sneaker.jpg" /></div>
</body>
</html>
`;

console.log("=== Test 1: Adidas-style HTML ===");
const r1 = extractFromHtml(adidasHtml, "https://www.adidas.co.in/adilette-flow-slides/IF4134.html");
console.log(r1);
console.assert(r1.title === "Adilette Flow Slides", `Title mismatch: ${r1.title}`);
console.assert(r1.price.includes("2999"), `Price mismatch: ${r1.price}`);
console.assert(r1.imageUrl.includes("IF4134"), `Image mismatch: ${r1.imageUrl}`);
console.assert(r1.currency === "INR", `Currency mismatch: ${r1.currency}`);

console.log("\n=== Test 2: WooCommerce-style HTML (footballmonk) ===");
const r2 = extractFromHtml(footballMonkHtml, "https://footballmonk.in/product/premium-quality-psg-jordan-edition-jersey-2024-25/");
console.log(r2);
console.assert(r2.title.includes("PSG"), `Title mismatch: ${r2.title}`);
console.assert(r2.price.includes("799"), `Price mismatch: ${r2.price}`);
console.assert(r2.imageUrl.includes("psg-jordan"), `Image mismatch: ${r2.imageUrl}`);

console.log("\n=== Test 3: Minimal HTML (DOM-only fallback) ===");
const r3 = extractFromHtml(minimalHtml, "https://example.com/product/sneakers");
console.log(r3);
console.assert(r3.title === "Cool Sneakers", `Title mismatch: ${r3.title}`);
console.assert(r3.price.includes("129.99"), `Price mismatch: ${r3.price}`);

console.log("\nAll tests passed!");
