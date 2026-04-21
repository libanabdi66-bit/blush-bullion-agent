const fs = require("fs");

function runFullSystem() {
  console.log("\n🚀 RUNNING FULL AUTO AGENT...\n");

  const products = JSON.parse(fs.readFileSync("products.json"));
  const tiktok = JSON.parse(fs.readFileSync("tiktok_products.json"));
  const autods = JSON.parse(fs.readFileSync("autods_products.json"));
  const copy = JSON.parse(fs.readFileSync("shopify_copy.json"));
  const content = JSON.parse(fs.readFileSync("content_plan.json"));

  console.log("📦 Products loaded:", products.length);
  console.log("🔥 TikTok trends:", tiktok.length);
  console.log("🤖 AutoDS products:", autods.length);
  console.log("🛍 Shopify copy:", copy.length);
  console.log("📱 Content ideas:", content.length);

  const winners = products.filter(p => p.score >= 80);

  console.log("\n💰 TOP WINNERS:");
  winners.forEach(p => {
    console.log(`- ${p.name} (${p.score})`);
  });

  console.log("\n✅ SYSTEM READY FOR:");
  console.log("→ Product Upload");
  console.log("→ TikTok Marketing");
  console.log("→ Store Scaling\n");
}

runFullSystem();
