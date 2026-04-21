const fs = require("fs");
const path = require("path");

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "";
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || "";
const STRICT_MODE = true;

function round(num) {
  return Math.round(num * 100) / 100;
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function readJson(filePath, fallback = []) {
  try {
    const fullPath = path.join(__dirname, filePath);
    const raw = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

function writeText(filePath, text) {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, text, "utf8");
}

function normalizeProduct(product, source = "manual") {
  return {
    name: product.name || "Untitled Product",
    category: product.category || "Other",
    sellPrice: Number(product.sellPrice || 0),
    costPrice: Number(product.costPrice || 0),
    trendScore: Number(product.trendScore || 0),
    competitionScore: Number(product.competitionScore || 0),
    aestheticScore: Number(product.aestheticScore || 0),
    brandFitScore: Number(product.brandFitScore || 0),
    impulseBuyScore: Number(product.impulseBuyScore || 0),
    source,
    image: product.image || "",
    description: product.description || "",
    supplierUrl: product.supplierUrl || ""
  };
}

function loadAllProducts() {
  const products = [];

  if (fileExists("products.json")) {
    const manualProducts = readJson("products.json").map((p) =>
      normalizeProduct(p, "products.json")
    );
    products.push(...manualProducts);
  }

  if (fileExists("autods_products.json")) {
    const autodsProducts = readJson("autods_products.json").map((p) =>
      normalizeProduct(p, "AutoDS")
    );
    products.push(...autodsProducts);
  }

  if (fileExists("tiktok_products.json")) {
    const tiktokProducts = readJson("tiktok_products.json").map((p) =>
      normalizeProduct(p, "TikTok")
    );
    products.push(...tiktokProducts);
  }

  return products;
}

function calculateMargin(sellPrice, costPrice) {
  const profit = sellPrice - costPrice;
  const marginPercent = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;

  return {
    profit: round(profit),
    marginPercent: round(marginPercent)
  };
}

function calculateTrendBoost(product) {
  let trendBoost = 0;

  if (product.trendScore >= 90) trendBoost += 5;
  if (product.category === "Lips" || product.category === "Lashes") {
    trendBoost += 3;
  }
  if (product.impulseBuyScore >= 85) {
    trendBoost += 2;
  }

  return trendBoost;
}

function calculateProductScore(product) {
  const { profit, marginPercent } = calculateMargin(
    product.sellPrice,
    product.costPrice
  );

  const marginScore = Math.min(marginPercent, 100);
  const competitionPenalty = 100 - product.competitionScore;

  const baseScore =
    product.trendScore * 0.24 +
    product.brandFitScore * 0.22 +
    marginScore * 0.2 +
    product.aestheticScore * 0.14 +
    product.impulseBuyScore * 0.12 +
    competitionPenalty * 0.08;

  const trendBoost = calculateTrendBoost(product);
  const finalScore = round(baseScore + trendBoost);

  let verdict = "Skip";

  if (STRICT_MODE) {
    if (
      profit >= 10 &&
      marginPercent >= 65 &&
      finalScore >= 80 &&
      product.trendScore >= 88 &&
      product.competitionScore <= 75
    ) {
      verdict = "Strong Winner";
    } else if (
      profit >= 8 &&
      marginPercent >= 60 &&
      finalScore >= 75
    ) {
      verdict = "Test Soon";
    } else if (finalScore >= 65) {
      verdict = "Maybe";
    }
  } else {
    if (finalScore >= 85) verdict = "Strong Winner";
    else if (finalScore >= 75) verdict = "Test Soon";
    else if (finalScore >= 65) verdict = "Maybe";
  }

  return {
    ...product,
    profit,
    marginPercent,
    totalScore: finalScore,
    verdict
  };
}

function rankProducts(products) {
  return products
    .map(calculateProductScore)
    .sort((a, b) => b.totalScore - a.totalScore);
}

function getWinners(products) {
  return products.filter((p) => p.verdict === "Strong Winner");
}

function getTestSoon(products) {
  return products.filter((p) => p.verdict === "Test Soon");
}

function generateReport(products) {
  const winners = getWinners(products);
  const testSoon = getTestSoon(products);
  const maybe = products.filter((p) => p.verdict === "Maybe");
  const skip = products.filter((p) => p.verdict === "Skip");

  let report = `# Blush & Bullion Product Report

Generated: ${new Date().toISOString()}

## Summary
- Strong Winners: ${winners.length}
- Test Soon: ${testSoon.length}
- Maybe: ${maybe.length}
- Skip: ${skip.length}

## Ranked Products
`;

  products.forEach((p, index) => {
    report += `
### ${index + 1}. ${p.name}
- Category: ${p.category}
- Source: ${p.source}
- Sell Price: £${p.sellPrice}
- Cost Price: £${p.costPrice}
- Profit: £${p.profit}
- Margin: ${p.marginPercent}%
- Trend Score: ${p.trendScore}
- Competition Score: ${p.competitionScore}
- Brand Fit: ${p.brandFitScore}
- Final Score: ${p.totalScore}
- Verdict: ${p.verdict}
`;
  });

  return report;
}

async function createShopifyProduct(product) {
  if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
    throw new Error("Missing SHOPIFY_STORE_URL or SHOPIFY_ADMIN_TOKEN");
  }

  const query = `
    mutation productCreate($input: ProductCreateInput!) {
      productCreate(product: $input) {
        product {
          id
          title
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const description = product.description || `${product.name} selected by Blush & Bullion strict product agent.`;

  const variables = {
    input: {
      title: product.name,
      descriptionHtml: `<p>${description}</p>`,
      productType: product.category,
      vendor: "Blush & Bullion",
      tags: [
        "AI Agent",
        "Winning Product",
        product.verdict,
        product.category,
        product.source
      ]
    }
  };

  const response = await fetch(
    `https://${SHOPIFY_STORE_URL}/admin/api/2026-04/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN
      },
      body: JSON.stringify({ query, variables })
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const result = data.data?.productCreate;

  if (result?.userErrors?.length) {
    throw new Error(
      `Shopify user error: ${result.userErrors.map((e) => e.message).join(", ")}`
    );
  }

  return result?.product || null;
}

async function publishWinnersToShopify(winners) {
  if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
    console.log("\nSkipping Shopify publish: no SHOPIFY_ADMIN_TOKEN set.\n");
    return;
  }

  console.log(`\nPublishing ${winners.length} strong winners to Shopify...\n`);

  for (const winner of winners) {
    try {
      const created = await createShopifyProduct(winner);
      console.log(`Created Shopify product: ${created?.title || winner.name}`);
    } catch (error) {
      console.error(`Failed to publish ${winner.name}: ${error.message}`);
    }
  }
}

function printSummary(products) {
  console.log("\n=== BLUSH & BULLION FULL AUTO AGENT ===\n");

  if (SHOPIFY_STORE_URL) {
    console.log(`Store: ${SHOPIFY_STORE_URL}`);
  } else {
    console.log("Store: not set");
  }

  console.log(`Strict Mode: ${STRICT_MODE ? "ON" : "OFF"}`);
  console.log(`Products Loaded: ${products.length}\n`);

  products.forEach((p, index) => {
    console.log(`${index + 1}. ${p.name} [${p.category}]`);
    console.log(`   Source: ${p.source}`);
    console.log(`   Sell Price: £${p.sellPrice}`);
    console.log(`   Cost Price: £${p.costPrice}`);
    console.log(`   Profit: £${p.profit}`);
    console.log(`   Margin: ${p.marginPercent}%`);
    console.log(`   Trend Score: ${p.trendScore}`);
    console.log(`   Competition Score: ${p.competitionScore}`);
    console.log(`   Brand Fit Score: ${p.brandFitScore}`);
    console.log(`   Final Score: ${p.totalScore}`);
    console.log(`   Verdict: ${p.verdict}`);
    console.log("");
  });

  const winners = getWinners(products);
  const testSoon = getTestSoon(products);

  console.log("=== SUMMARY ===");
  console.log(`Strong Winners Found: ${winners.length}`);
  console.log(`Test Soon Products: ${testSoon.length}`);
}

async function runAgent() {
  const rawProducts = loadAllProducts();

  if (!rawProducts.length) {
    console.log("No products found. Add products to products.json, autods_products.json, or tiktok_products.json.");
    return;
  }

  const ranked = rankProducts(rawProducts);
  const winners = getWinners(ranked);
  const report = generateReport(ranked);

  writeJson("winners.json", winners);
  writeText("report.md", report);

  printSummary(ranked);
  await publishWinnersToShopify(winners);

  console.log("\nSaved:");
  console.log("- winners.json");
  console.log("- report.md\n");
}

runAgent().catch((error) => {
  console.error("Agent failed:", error.message);
});
