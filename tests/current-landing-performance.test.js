const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "public", "index.html");
const cssPath = path.join(
  root,
  "public",
  "css",
  "current-landing-page.css"
);
const heroPath = path.join(
  root,
  "public",
  "assets",
  "landing",
  "current-hero.webp"
);
const loaderPath = path.join(
  root,
  "public",
  "js",
  "meridian-landing-loader.js"
);

for(const filePath of [indexPath, cssPath, heroPath, loaderPath]){
  assert.ok(fs.existsSync(filePath), `missing required file: ${filePath}`);
}

const indexStat = fs.statSync(indexPath);
const cssStat = fs.statSync(cssPath);
const heroStat = fs.statSync(heroPath);
const loaderStat = fs.statSync(loaderPath);
const index = fs.readFileSync(indexPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const hero = fs.readFileSync(heroPath);

assert.ok(
  indexStat.size < 100000,
  `index.html should stay below 100 KB, got ${indexStat.size}`
);
assert.ok(
  cssStat.size > 30000 && cssStat.size < 100000,
  `external landing CSS size looks unexpected: ${cssStat.size}`
);
assert.ok(
  heroStat.size < 300000,
  `optimized hero should stay below 300 KB, got ${heroStat.size}`
);
assert.strictEqual(
  hero.subarray(0, 4).toString("ascii"),
  "RIFF",
  "hero asset must be a RIFF WebP file"
);
assert.strictEqual(
  hero.subarray(8, 12).toString("ascii"),
  "WEBP",
  "hero asset must be WebP"
);

assert.doesNotMatch(
  index,
  /data:image\//i,
  "index.html must not contain embedded base64 images"
);
assert.doesNotMatch(
  index,
  /<style>[\s\S]*<\/style>/i,
  "large landing CSS must not remain inline"
);
assert.match(
  index,
  /href="\/css\/current-landing-page\.css\?v=1"/,
  "index must reference the external landing stylesheet"
);
assert.match(
  index,
  /rel="preload" href="\/assets\/landing\/current-hero\.webp\?v=1"/,
  "hero image must be preloaded"
);
assert.match(
  index,
  /src="\/assets\/landing\/current-hero\.webp\?v=1"/,
  "hero image must use the optimized external WebP asset"
);
assert.match(index, /width="989"/, "hero width must be declared");
assert.match(index, /height="1357"/, "hero height must be declared");
assert.match(
  index,
  /fetchpriority="high"/,
  "above-the-fold hero must receive high fetch priority"
);
assert.match(
  index,
  /decoding="async"/,
  "hero image should decode asynchronously"
);
assert.ok(
  (index.match(/data-question=/g) || []).length >= 20,
  "existing chat CTAs must be preserved"
);
assert.match(css, /\.hero\s*\{/, "hero styles must be preserved");
assert.match(
  css,
  /\.hero-figure\s*\{/,
  "hero figure styles must be preserved"
);
assert.match(
  css,
  /@media \(max-width: 760px\)/,
  "mobile landing styles must be preserved"
);

const originalBytes = 2661416;
const optimizedInitialBytes =
  indexStat.size + cssStat.size + heroStat.size + loaderStat.size;
const reduction =
  1 - optimizedInitialBytes / originalBytes;

assert.ok(
  reduction > 0.9,
  `initial owned assets should be reduced by more than 90%, got ${(reduction * 100).toFixed(2)}%`
);

console.log(
  `[PASS] Landing performance tests passed. ` +
  `Owned initial bytes: ${optimizedInitialBytes}; ` +
  `reduction: ${(reduction * 100).toFixed(2)}%.`
);
