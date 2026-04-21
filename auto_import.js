const fs = require("fs");
const path = require("path");

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "";
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || "";

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

function buildImportCandidates(items) {
  return items.map((item) => ({
    title: item.title || `${item.name} | Blush & Bullion`,
    name: item.name,
    category: item.category,
    verdict: item.verdict,
    source: item.source || "agent",
    subtitle: item.subtitle || "Affordable luxury beauty.",
    description: item.description || "",
    benefits: item.benefits || [],
    tiktokScript: item.tiktokScript || [],
    adCaption: item.adCaption || "",
    priceSuggestion: item.priceSuggestion || "",
    readyToImport:
      item.verdict === "Strong Winner" || item.verdict === "Test Soon"
  }));
}

async function createShopifyProduct(candidate) {
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

  const variables = {
    input: {
      title: candidate.title,
      descriptionHtml: `<p>${candidate.description}</p><ul>${candidate.benefits
        .map((b) => `<li>${b}</li>`)
        .join("")}</ul>`,
      productType: candidate.category,
      vendor: "Blush & Bullion",
      tags: [
        "AI Import",
        candidate.verdict,
        candidate.category,
        candidate.source
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
    throw new Error(result.userErrors.map((e) => e.message).join(", "));
  }

  return result?.product || null;
}

async function run() {
  const copyItems = readJson("shopify_copy.json", []);
  const candidates = buildImportCandidates(copyItems);

  writeJson("import_candidates.json", candidates);
  console.log("Created import_candidates.json");

  const ready = candidates.filter((c) => c.readyToImport);

  if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
    console.log(
      "Skipping Shopify import because SHOPIFY_STORE_URL or SHOPIFY_ADMIN_TOKEN is missing."
    );
    return;
  }

  console.log(`Importing ${ready.length} products to Shopify...`);

  for (const candidate of ready) {
    try {
      const created = await createShopifyProduct(candidate);
      console.log(`Imported: ${created?.title || candidate.title}`);
    } catch (error) {
      console.error(`Failed to import ${candidate.title}: ${error.message}`);
    }
  }
}

run().catch((error) => {
  console.error("Auto import failed:", error.message);
});
