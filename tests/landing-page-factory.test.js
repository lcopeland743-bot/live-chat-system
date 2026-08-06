"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  PROJECT_ROOT,
  buildAll,
  validateAll
} = require("../scripts/landing-factory-core");

function read(relativePath){
  return fs.readFileSync(
    path.join(PROJECT_ROOT, relativePath),
    "utf8"
  );
}

function run(){
  const generated = buildAll();
  const validation = validateAll({ requireOutput: true });

  assert.deepStrictEqual(
    validation.errors,
    [],
    `Validation errors found: ${validation.errors.join(", ")}`
  );

  assert.strictEqual(
    generated.length,
    3,
    "Phase 1 must generate exactly three Market Clarity pages"
  );

  const expectedSlugs = [
    "market-clarity-a",
    "market-clarity-b",
    "market-clarity-c"
  ];

  assert.deepStrictEqual(
    generated.map((item)=>item.slug).sort(),
    expectedSlugs
  );

  const pageIds = new Set();
  const campaignIds = new Set();

  expectedSlugs.forEach((slug)=>{
    const html = read(`public/lp/${slug}/index.html`);

    assert.match(html, /window\.MeridianLandingContext/);
    assert.match(html, /\/js\/landing-page-runtime\.js/);
    assert.match(html, /\/js\/meridian-landing-loader\.js/);
    assert.match(html, /data-meridian-chat/);
    assert.match(html, /data-cta-id="hero-primary"/);
    assert.match(html, /Educational market research only/);

    if(slug === "market-clarity-a"){
      assert.match(html, /fetchpriority="high"/);
    }
    else{
      assert.doesNotMatch(html, /rel="preload" as="image"/);
    }

    assert.doesNotMatch(html, /data:image\//i);
    assert.doesNotMatch(html, /\/js\/embed\.js/);
    assert.doesNotMatch(html, /landing-chat-trigger\.js/);

    const pageIdMatch = html.match(/"pageId":\s*"([^"]+)"/);
    const campaignMatch = html.match(/"campaignId":\s*"([^"]+)"/);
    const routeMatch = html.match(/"whatsappRouteKey":\s*"([^"]+)"/);

    assert.ok(pageIdMatch, `${slug} is missing pageId`);
    assert.ok(campaignMatch, `${slug} is missing campaignId`);
    assert.ok(routeMatch, `${slug} is missing whatsappRouteKey`);
    assert.strictEqual(routeMatch[1], slug);

    pageIds.add(pageIdMatch[1]);
    campaignIds.add(campaignMatch[1]);
  });

  assert.strictEqual(pageIds.size, 3, "pageId values must be unique");
  assert.strictEqual(campaignIds.size, 3, "campaignId values must be unique");

  const heroPath = path.join(
    PROJECT_ROOT,
    "public/assets/landing/factory/market-clarity-hero.webp"
  );
  const heroSize = fs.statSync(heroPath).size;

  assert.ok(heroSize > 10000, "Hero asset appears empty");
  assert.ok(heroSize < 250000, "Hero asset must remain below 250 KB");

  const currentIndexPath = path.join(PROJECT_ROOT, "public/index.html");

  assert.ok(
    fs.existsSync(currentIndexPath),
    "Existing public/index.html must remain present"
  );

  console.log("[PASS] Landing Page Factory Phase 1 tests passed.");
}

run();
