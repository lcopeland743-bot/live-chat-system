/**
 * Campaign 001 static hosting and integration validation.
 */

"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const campaignDirectory = path.join(
    root,
    "public",
    "lp",
    "001-beyond-the-headlines"
);
const indexPath = path.join(campaignDirectory, "index.html");
const expectedQuestion =
    "What changed behind the move, and what evidence would change your interpretation?";

function count(source, pattern) {
    return (source.match(pattern) || []).length;
}

function hashFile(filePath) {
    return crypto
        .createHash("sha256")
        .update(fs.readFileSync(filePath))
        .digest("hex");
}

assert.ok(fs.existsSync(indexPath), "Campaign 001 index.html must exist");
assert.ok(
    fs.existsSync(path.join(campaignDirectory, "images", "market-lens-hero-r3.png")),
    "Campaign 001 Hero artwork must be hosted"
);
assert.ok(
    fs.existsSync(path.join(campaignDirectory, "images", "market-infrastructure.png")),
    "Campaign 001 supporting artwork must be hosted"
);
assert.strictEqual(fs.existsSync(path.join(campaignDirectory, "node_modules")), false);
assert.strictEqual(fs.existsSync(path.join(campaignDirectory, ".next")), false);

const html = fs.readFileSync(indexPath, "utf8");
const renderedHtml = html.slice(0, html.indexOf("</main>") + "</main>".length);

assert.strictEqual(count(renderedHtml, /data-meridian-chat(?:="")?/g), 5);
assert.strictEqual(count(renderedHtml, /data-meridian-floating-entry(?:="")?/g), 1);
assert.strictEqual(count(renderedHtml, /data-meridian-auto-send="false"/g), 5);
assert.strictEqual(
    count(renderedHtml, new RegExp(expectedQuestion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
    5
);
assert.strictEqual(count(renderedHtml, /href="\/analysis\/entry\?campaign=001"/g), 5);
assert.strictEqual(count(html, /<script src="\/js\/campaign-analysis-entry-link\.js" defer><\/script>/g), 1);
assert.strictEqual(count(html, /<script src="\/js\/meridian-landing-loader\.js\?v=20260806-2"/g), 1);
assert.match(html, /\/lp\/001-beyond-the-headlines\/_next\//);
assert.match(html, /\/lp\/001-beyond-the-headlines\/images\/market-lens-hero-r3\.png/);
assert.match(html, /\/lp\/001-beyond-the-headlines\/images\/market-infrastructure\.png/);
assert.doesNotMatch(html, /D:\\Projects\\Landing|node_modules|ANALYSIS_ENTRY_URL/);

const rootHtmlPath = path.join(root, "public", "index.html");
const rootHtml = fs.readFileSync(rootHtmlPath, "utf8");
assert.strictEqual(
    hashFile(rootHtmlPath),
    "0b89080a44dd51f8a600e9de5900f9d03201a1ae70611fbe8a9502b94a5a646d",
    "the existing backend homepage must remain byte-for-byte unchanged for this release"
);
assert.doesNotMatch(rootHtml, /001-beyond-the-headlines|Beyond the Headlines/);

const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
assert.match(serverSource, /getAnalysisCampaignByLandingPath/);
assert.match(serverSource, /campaign\.landingPath[\s\S]*"index\.html"/);
assert.match(serverSource, /"public",[\s\S]*"index\.html"/);
assert.doesNotMatch(serverSource, /app\.(?:get|use)\(\s*["']\/["'][\s\S]{0,200}001-beyond-the-headlines/);

for (const slug of [
    "002-agi-repricing",
    "003-weight-of-the-index",
    "004-when-machines-become-work"
]) {
    assert.ok(
        fs.existsSync(path.join(root, "public", "lp", slug, "index.html")),
        `Campaign ${slug} must remain intact`
    );
}

console.log("[PASS] Campaign 001 static hosting validation passed.");
