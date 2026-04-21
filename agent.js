const fs = require("fs");

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "";
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "";

function round(num) {
  return Math.round(num * 100) / 100;
}

function loadProducts() {
  const raw = fs.readFileSync("./products.json", "utf8");
  return JSON.parse(raw);
}

function calculateMargin(sellPrice, costPrice) {
  const profit = sellPrice - costPrice;
  const marginPercent = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;

  return {
    profit: round(profit),
    marginPercent: round(marginPercent),
  };
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

  let trendBoost = 0;

  if (product.trendScore >= 90) trendBoost += 5;
  if (product.category === "Lips" || product.category === "Lashes") {
    trendBoost += 3;
  }

  const finalScore = round(baseScore + trendBoost);

  let verdict = "Skip";

  if (profit >= 10 && marginPercent >= 65 && finalScore >= 80) {
    verdict = "Strong Winner";
  } else if (profit >= 8 && marginPercent >= 60 && finalScore >= 75) {
    verdict = "Test Soon";
  } else if (finalScore >= 65) {
    verdict = "Maybe";
  }

  return {
    ...product,
    profit,
    marginPercent,
    totalScore: finalScore,
    verdict,
  };
}

function rankProducts(products) {
  return products
    .map(calculateProductScore)
    .sort((a, b) => b.totalScore - a.totalScore);
}

function printSummary(products) {
  console.log("\n=== BLUSH & BULLION STRICT PRODUCT AGENT ===\n");

  if (SHOPIFY_STORE_URL) {
    console.log(`Store: ${SHOPIFY_STORE_URL}`);
  }

  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    console.log("Note: Shopify credentials are not fully set yet.");
  }

  console.log("\nTop ranked products:\n");

  products.forEach((p, index) => {
    console.log(`${index + 1}. ${p.name} [${p.category}]`);
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

  const strongWinners = products.filter((p) => p.verdict === "Strong Winner");
  const testSoon = products.filter((p) => p.verdict === "Test Soon");
  const maybe = products.filter((p) => p.verdict === "Maybe");
  const skip = products.filter((p) => p.verdict === "Skip");

  console.log("=== SUMMARY ===");
  console.log(`Strong Winners Found: ${strongWinners.length}`);
  console.log(`Test Soon Products: ${testSoon.length}`);
  console.log(`Maybe Products: ${maybe.length}`);
  console.log(`Skipped Products: ${skip.length}`);
}

function runAgent() {
  const products = loadProducts();
  const ranked = rankProducts(products);
  printSummary(ranked);
}

runAgent();
