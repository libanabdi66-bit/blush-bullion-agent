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
    products.push(
      ...readJson("products.json").map((p) => normalizeProduct(p, "products.json"))
    );
  }

  if (fileExists("autods_products.json")) {
    products.push(
      ...readJson("autods_products.json").map((p) => normalizeProduct(p, "AutoDS"))
    );
  }

  if (fileExists("tiktok_products.json")) {
    products.push(
      ...readJson("tiktok_products.json").map((p) => normalizeProduct(p, "TikTok"))
    );
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
  if (product.category === "Lips" || product.category === "Lashes") trendBoost += 3;
  if (product.impulseBuyScore >= 85) trendBoost += 2;

  return trendBoost;
}

function isStrongWinner(scoredProduct) {
  return (
    scoredProduct.profit >= 10 &&
    scoredProduct.marginPercent >= 60 &&
    scoredProduct.totalScore >= 80 &&
    scoredProduct.trendScore >= 88 &&
    scoredProduct.competitionScore <= 75
  );
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

  const scoredProduct = {
    ...product,
    profit,
    marginPercent,
    totalScore: finalScore
  };

  let verdict = "Skip";

  if (STRICT_MODE) {
    if (isStrongWinner(scoredProduct)) {
      verdict = "Strong Winner";
    } else if (scoredProduct.totalScore >= 75) {
      verdict = "Test Soon";
    } else if (scoredProduct.totalScore >= 65) {
      verdict = "Maybe";
    } else {
      verdict = "Skip";
    }
  } else {
    if (scoredProduct.totalScore >= 85) verdict = "Strong Winner";
    else if (scoredProduct.totalScore >= 75) verdict = "Test Soon";
    else if (scoredProduct.totalScore >= 65) verdict = "Maybe";
    else verdict = "Skip";
  }

  return {
    ...scoredProduct,
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

function getBenefitBullets(product) {
  const bullets = [];

  if (product.category === "Lips") {
    bullets.push("Glossy, fuller-looking finish");
    bullets.push("Perfect for quick beauty content");
    bullets.push("Easy add-to-cart impulse buy");
  } else if (product.category === "Lashes") {
    bullets.push("Fast beauty upgrade in minutes");
    bullets.push("Beginner-friendly glam result");
    bullets.push("High visual impact for short-form video");
  } else if (product.category === "Skincare") {
    bullets.push("Spa-like routine at home");
    bullets.push("Aesthetic self-care appeal");
    bullets.push("Strong gifting and routine potential");
  } else {
    bullets.push("Easy trend-led beauty buy");
    bullets.push("Strong visual appeal");
    bullets.push("Great for social content");
  }

  return bullets;
}

function generateShortSubtitle(product) {
  if (product.category === "Lips") return "Glossy, viral, handbag-ready.";
  if (product.category === "Lashes") return "Fast glam with high visual payoff.";
  if (product.category === "Skincare") return "Aesthetic self-care that feels premium.";
  return "Trend-led beauty with everyday appeal.";
}

function generateDescription(product) {
  const bullets = getBenefitBullets(product);

  return `Meet ${product.name} — a trend-led ${product.category.toLowerCase()} pick selected by the Blush & Bullion AI agent.

Designed for beauty lovers who want results that look luxe without the high-end price tag, this product stands out for its visual appeal, impulse-buy power, and strong content potential.

Why you'll love it:
- ${bullets[0]}
- ${bullets[1]}
- ${bullets[2]}

Perfect for customers who love affordable luxury, polished routines, and products that feel made for TikTok-worthy moments.`;
}

function generateTikTokHooks(product) {
  return [
    `This ${product.category.toLowerCase()} product is too good to stay underrated…`,
    `POV: you found the beauty product everyone will ask you about`,
    `This might be the prettiest ${product.category.toLowerCase()} find in my routine`
  ];
}

function generateTikTokCaption(product) {
  return `Obsessed with ${product.name} ✨ Affordable luxury energy without the luxury price. #BeautyFinds #TikTokMadeMeBuyIt #BlushAndBullion #${product.category}`;
}

function generateProductTitle(product) {
  return `${product.name} | Blush & Bullion`;
}

function generateContentAngle(product) {
  if (product.category === "Lips") return "before/after lip look";
  if (product.category === "Lashes") return "quick glam transformation";
  if (product.category === "Skincare") return "self-care routine reveal";
  return "viral beauty demo";
}

function buildContentPlan(products) {
  return products.map((product) => ({
    name: product.name,
    category: product.category,
    verdict: product.verdict,
    title: generateProductTitle(product),
    subtitle: generateShortSubtitle(product),
    description: generateDescription(product),
    bullets: getBenefitBullets(product),
    tiktokHooks: generateTikTokHooks(product),
    tiktokCaption: generateTikTokCaption(product),
    contentAngle: generateContentAngle(product),
    priceSuggestion: `£${product.sellPrice}`,
    source: product.source
  }));
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

function printSummary(products) {
  console.log("\n=== BLUSH & BULLION FULL AUTO AGENT ===\n");
  console.log(`Store: ${SHOPIFY_STORE_URL || "not set"}`);
  console.log(`Strict Mode: ${STRICT_MODE ? "ON" : "OFF"}`);
  console.log(`Products Loaded: ${products.length}\n`);

  products.forEach((p, index) => {
    console.log(`${index + 1}. ${p.name} [${p.category}]`);
    console.log(`   Source: ${p.source}`);
    console.log(`   Sell Price: £${p.sellPrice}`);
    console.log(`   Cost Price: £${p.costPrice}`);
    console.log(`   Profit: £${p.profit}`);
    console.log(`   Margin: ${p.marginPercent}%`);
    console.log(`   Final Score: ${p.totalScore}`);
    console.log(`   Verdict: ${p.verdict}`);
    console.log("");
  });

  console.log("=== SUMMARY ===");
  console.log(`Strong Winners Found: ${getWinners(products).length}`);
  console.log(`Test Soon Products: ${getTestSoon(products).length}`);
}

async function runAgent() {
  const rawProducts = loadAllProducts();

  if (!rawProducts.length) {
    console.log("No products found. Add products to products.json, autods_products.json, or tiktok_products.json.");
    return;
  }

  const ranked = rankProducts(rawProducts);
  const winners = getWinners(ranked);
  const contentPlan = buildContentPlan(
    ranked.filter((p) => p.verdict === "Strong Winner" || p.verdict === "Test Soon")
  );
  const report = generateReport(ranked);

  writeJson("winners.json", winners);
  writeJson("content_plan.json", contentPlan);
  writeText("report.md", report);

  printSummary(ranked);

  console.log("\nSaved:");
  console.log("- winners.json");
  console.log("- content_plan.json");
  console.log("- report.md\n");
}

runAgent().catch((error) => {
  console.error("Agent failed:", error.message);
});
