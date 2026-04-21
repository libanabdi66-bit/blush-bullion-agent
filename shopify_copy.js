const fs = require("fs");
const path = require("path");

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

function makeBenefits(product) {
  if (product.category === "Lips") {
    return [
      "Glossy, fuller-looking finish",
      "Easy everyday beauty staple",
      "Perfect impulse-buy product"
    ];
  }

  if (product.category === "Lashes") {
    return [
      "Quick glam result in minutes",
      "Beginner-friendly beauty upgrade",
      "High visual payoff for content"
    ];
  }

  if (product.category === "Skincare") {
    return [
      "Aesthetic self-care essential",
      "Spa-like feel at home",
      "Strong daily routine appeal"
    ];
  }

  return [
    "Trend-led beauty product",
    "Strong visual appeal",
    "Great content potential"
  ];
}

function makeDescription(product) {
  const benefits = makeBenefits(product);

  return `${product.name} is a trend-led ${product.category.toLowerCase()} pick chosen for Blush & Bullion.

Designed for beauty lovers who want affordable luxury, this product stands out for its visual appeal, strong margin, and social content potential.

Why you'll love it:
• ${benefits[0]}
• ${benefits[1]}
• ${benefits[2]}

Perfect for customers who love polished beauty routines, premium-looking results, and products that feel made for viral moments.`;
}

function makeTikTokScript(product) {
  return [
    `Hook: This ${product.category.toLowerCase()} product is too good to gatekeep...`,
    `Show the product clearly in hand.`,
    `Demo the best visual result in the first 3 seconds.`,
    `Say: "${product.name} gives affordable luxury energy without the high-end price."`,
    `Show close-up result / before and after.`,
    `CTA: "Would you try this?"`
  ];
}

function makeAdCaption(product) {
  return `${product.name} ✨ Beauty that looks luxe, feels premium, and stays affordable. #BlushAndBullion #BeautyFinds #TikTokMadeMeBuyIt`;
}

function buildShopifyCopy(items) {
  return items.map((product) => ({
    name: product.name,
    category: product.category,
    title: `${product.name} | Blush & Bullion`,
    subtitle: product.subtitle || "Affordable luxury beauty.",
    description: makeDescription(product),
    benefits: makeBenefits(product),
    tiktokScript: makeTikTokScript(product),
    adCaption: makeAdCaption(product),
    verdict: product.verdict,
    source: product.source || "agent"
  }));
}

function run() {
  const contentPlan = readJson("content_plan.json", []);
  const output = buildShopifyCopy(contentPlan);
  writeJson("shopify_copy.json", output);
  console.log("Created shopify_copy.json");
}

run();
