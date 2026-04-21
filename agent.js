// blush-bullion-agent/agent.js

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "";
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "";

/**
 * Product Agent for Blush & Bullion
 * - Scores beauty/skincare products
 * - Ranks them by store fit, trend potential, and profit
 * - Uses sample data for now
 *
 * Secrets stay in environment variables.
 */

const sampleProducts = [
  {
    name: "Hydrating Lip Oil",
    category: "Lips",
    sellPrice: 14.99,
    costPrice: 3.8,
    trendScore: 91,
    competitionScore: 62,
    aestheticScore: 90,
    brandFitScore: 95,
    impulseBuyScore: 87,
  },
  {
    name: "DIY Lash Cluster Kit",
    category: "Lashes",
    sellPrice: 19.99,
    costPrice: 6.2,
    trendScore: 93,
    competitionScore: 78,
    aestheticScore: 88,
    brandFitScore: 92,
    impulseBuyScore: 84,
  },
  {
    name: "Ice Face Roller",
    category: "Skincare",
    sellPrice: 11.99,
    costPrice: 4.4,
    trendScore: 74,
    competitionScore: 70,
    aestheticScore: 76,
    brandFitScore: 72,
    impulseBuyScore: 69,
  },
  {
    name: "Peptide Lip Treatment",
    category: "Lips",
    sellPrice: 17.99,
    costPrice: 5.5,
    trendScore: 88,
    competitionScore: 58,
    aestheticScore: 91,
    brandFitScore: 94,
    impulseBuyScore: 83,
  },
  {
    name: "Heated Lash Curler",
    category: "Lashes",
    sellPrice: 16.99,
    costPrice: 6.8,
    trendScore: 82,
    competitionScore: 66,
    aestheticScore: 80,
    brandFitScore: 85,
    impulseBuyScore: 78,
  },
];

function round(num) {
  return Math.round(num * 100) / 100;
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

  // Higher competition lowers score
  const competitionPenalty = 100 - product.competitionScore;

  const totalScore =
    product.trendScore * 0.24 +
    product.brandFitScore * 0.22 +
    marginScore * 0.20 +
    product.aestheticScore * 0.14 +
    product.impulseBuyScore * 0.12 +
    competitionPenalty * 0.08;

  let verdict = "Skip";
  if (totalScore >= 85) verdict = "Strong Winner";
  else if (totalScore >= 75) verdict = "Test Soon";
  else if (totalScore >= 65) verdict = "Maybe";
  else verdict = "Skip";

  return {
    ...product,
    profit,
    marginPercent,
    totalScore: round(totalScore),
    verdict,
  };
}

function rankProducts(products) {
  return products
    .map(calculateProductScore)
    .sort((a, b) => b.totalScore - a.totalScore);
}

function printSummary(products) {
  console.log("\n=== BLUSH & BULLION PRODUCT AGENT ===\n");

  if (!SHOPIFY_STORE_URL) {
    console.log("Note: SHOPIFY_STORE_URL is not set.");
  } else {
    console.log(`Store: ${SHOPIFY_STORE_URL}`);
  }

  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    console.log("Note: Shopify credentials are not fully set yet.");
  }

  console.log("\nTop ranked products:\n");

  products.forEach((p, index) => {
    console.log(
      `${index + 1}. ${p.name} [${p.category}]`
    );
    console.log(`   Sell Price: £${p.sellPrice}`);
    console.log(`   Cost Price: £${p.costPrice}`);
    console.log(`   Profit: £${p.profit}`);
    console.log(`   Margin: ${p.marginPercent}%`);
    console.log(`   Score: ${p.totalScore}`);
    console.log(`   Verdict: ${p.verdict}`);
    console.log("");
  });

  const winners = products.filter((p) => p.verdict === "Strong Winner");
  console.log(`Strong Winners Found: ${winners.length}`);
}

function runAgent() {
  const ranked = rankProducts(sampleProducts);
  printSummary(ranked);
}

runAgent();
