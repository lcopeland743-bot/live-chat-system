const assert = require("assert");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = path.resolve(__dirname, "..");
const loaderPath = path.join(
  root,
  "public",
  "js",
  "meridian-landing-loader.js"
);
const indexPath = path.join(root, "public", "index.html");

assert.ok(fs.existsSync(loaderPath), "landing loader must exist");
assert.ok(fs.existsSync(indexPath), "optimized index must exist");

childProcess.execFileSync(
  process.execPath,
  ["--check", loaderPath],
  { stdio: "pipe" }
);

const loader = fs.readFileSync(loaderPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

assert.match(
  loader,
  /\[data-meridian-chat\], \[data-question\]/,
  "loader must support the new stable trigger and legacy data-question buttons"
);
assert.match(
  loader,
  /data-meridian-base-url|meridianBaseUrl/,
  "loader must support an optional remote SDK base URL"
);
assert.match(
  loader,
  /window\.__MeridianLandingLoaderState/,
  "loader must prevent duplicate SDK initialization"
);
assert.match(
  loader,
  /waitForReady\(20000\)/,
  "loader must wait for the asynchronous embed SDK initialization"
);
assert.match(
  loader,
  /requestIdleCallback/,
  "loader must support idle SDK warm-up"
);
assert.match(
  loader,
  /window\.MeridianLandingLoader\s*=/,
  "loader must expose a small public control API"
);
assert.match(
  loader,
  /chatUI\.open\(\)/,
  "loader must open the existing chat UI"
);
assert.match(
  loader,
  /input\.value = question/,
  "loader must pass a CTA question into the existing chat input"
);
assert.match(
  loader,
  /sharedState\.lastTrigger = trigger/,
  "loader must retain the invoking Campaign control for accessible focus restoration"
);

assert.match(
  index,
  /<script src="\/js\/meridian-landing-loader\.js\?v=20260806-2" data-meridian-asset-version="20260806-2" defer><\/script>/,
  "current landing page must use the versioned stable loader"
);
assert.match(
  loader,
  /assetVersion/,
  "loader must pass a deterministic asset version to embed.js"
);
assert.match(
  loader,
  /\/js\/embed\.js\?v=/,
  "loader must cache-bust embed.js"
);
assert.doesNotMatch(
  index,
  /<script src="\/js\/embed\.js"><\/script>/,
  "current landing page must not directly load embed.js"
);
assert.doesNotMatch(
  index,
  /<script src="\/js\/integration\/landing-chat-trigger\.js"><\/script>/,
  "current landing page must not depend on the legacy trigger"
);

console.log("[PASS] Meridian landing loader tests passed.");
