"use strict";

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SITE_CONFIG_PATH = path.join(
  PROJECT_ROOT,
  "landing-src",
  "config",
  "site.json"
);
const PAGE_CONFIG_DIR = path.join(
  PROJECT_ROOT,
  "landing-src",
  "pages"
);
const OUTPUT_ROOT = path.join(
  PROJECT_ROOT,
  "public",
  "lp"
);

function readJson(filePath){
  const source = fs.readFileSync(filePath, "utf8");

  try{
    return JSON.parse(source);
  }
  catch(error){
    throw new Error(
      `Invalid JSON in ${path.relative(PROJECT_ROOT, filePath)}: ${error.message}`
    );
  }
}

function loadSite(){
  if(!fs.existsSync(SITE_CONFIG_PATH)){
    throw new Error("Missing landing-src/config/site.json");
  }

  return readJson(SITE_CONFIG_PATH);
}

function loadPages(){
  if(!fs.existsSync(PAGE_CONFIG_DIR)){
    throw new Error("Missing landing-src/pages directory");
  }

  return fs
    .readdirSync(PAGE_CONFIG_DIR)
    .filter((name)=>name.endsWith(".json"))
    .sort()
    .map((name)=>{
      const filePath = path.join(PAGE_CONFIG_DIR, name);
      const page = readJson(filePath);

      page.__sourceFile = path.relative(PROJECT_ROOT, filePath);

      return page;
    })
    .filter((page)=>page.enabled !== false);
}

function requireText(value, label, errors){
  if(typeof value !== "string" || !value.trim()){
    errors.push(`${label} is required`);
  }
}

function validatePage(page){
  const errors = [];
  const prefix = page.__sourceFile || page.slug || "page";

  [
    [page.template, `${prefix}: template`],
    [page.slug, `${prefix}: slug`],
    [page.pageId, `${prefix}: pageId`],
    [page.pageFamily, `${prefix}: pageFamily`],
    [page.variantId, `${prefix}: variantId`],
    [page.pageVersion, `${prefix}: pageVersion`],
    [page.campaignId, `${prefix}: campaignId`],
    [page.whatsappRouteKey, `${prefix}: whatsappRouteKey`],
    [page.audience, `${prefix}: audience`],
    [page.theme, `${prefix}: theme`],
    [page.layout, `${prefix}: layout`],
    [page.seo && page.seo.title, `${prefix}: seo.title`],
    [page.seo && page.seo.description, `${prefix}: seo.description`],
    [page.hero && page.hero.eyebrow, `${prefix}: hero.eyebrow`],
    [page.hero && page.hero.title, `${prefix}: hero.title`],
    [page.hero && page.hero.subtitle, `${prefix}: hero.subtitle`],
    [page.hero && page.hero.primaryCta, `${prefix}: hero.primaryCta`],
    [page.hero && page.hero.secondaryCta, `${prefix}: hero.secondaryCta`],
    [page.hero && page.hero.question, `${prefix}: hero.question`]
  ].forEach(([value, label])=>requireText(value, label, errors));

  if(
    typeof page.slug === "string" &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)
  ){
    errors.push(`${prefix}: slug must use lowercase kebab-case`);
  }


  if(
    typeof page.whatsappRouteKey === "string" &&
    !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(page.whatsappRouteKey)
  ){
    errors.push(`${prefix}: whatsappRouteKey must use lowercase letters, numbers, hyphens, or underscores`);
  }

  if(
    typeof page.layout === "string" &&
    !["authority", "questions", "demo"].includes(page.layout)
  ){
    errors.push(`${prefix}: unsupported layout ${page.layout}`);
  }

  if(!Array.isArray(page.prompts) || page.prompts.length < 4){
    errors.push(`${prefix}: prompts must contain at least four questions`);
  }
  else{
    page.prompts.forEach((prompt, index)=>{
      requireText(prompt, `${prefix}: prompts[${index}]`, errors);
    });
  }

  if(
    page.seo &&
    typeof page.seo.description === "string" &&
    page.seo.description.length > 180
  ){
    errors.push(`${prefix}: seo.description must be 180 characters or fewer`);
  }

  return errors;
}

function validateUnique(pages, key){
  const seen = new Map();
  const errors = [];

  pages.forEach((page)=>{
    const value = page[key];

    if(!value){
      return;
    }

    if(seen.has(value)){
      errors.push(
        `Duplicate ${key} "${value}" in ${seen.get(value)} and ${page.__sourceFile}`
      );
      return;
    }

    seen.set(value, page.__sourceFile);
  });

  return errors;
}

function validateProjectAssets(){
  const requiredFiles = [
    "public/js/meridian-landing-loader.js",
    "public/js/landing-page-runtime.js",
    "public/css/landing-factory.css",
    "public/assets/landing/factory/market-clarity-hero.webp"
  ];

  return requiredFiles
    .filter((relativePath)=>{
      return !fs.existsSync(path.join(PROJECT_ROOT, relativePath));
    })
    .map((relativePath)=>`Missing required file: ${relativePath}`);
}

function validateAll({ requireOutput = false } = {}){
  const site = loadSite();
  const pages = loadPages();
  const errors = [];

  [
    [site.brand, "site.brand"],
    [site.baseUrl, "site.baseUrl"],
    [site.locale, "site.locale"],
    [site.disclosure, "site.disclosure"]
  ].forEach(([value, label])=>requireText(value, label, errors));

  pages.forEach((page)=>errors.push(...validatePage(page)));

  ["slug", "pageId", "campaignId"].forEach((key)=>{
    errors.push(...validateUnique(pages, key));
  });

  errors.push(...validateProjectAssets());

  if(requireOutput){
    pages.forEach((page)=>{
      const outputPath = path.join(
        OUTPUT_ROOT,
        page.slug,
        "index.html"
      );

      if(!fs.existsSync(outputPath)){
        errors.push(`Missing generated page: public/lp/${page.slug}/index.html`);
      }
    });
  }

  return {
    site,
    pages,
    errors
  };
}

function loadTemplate(templateName){
  const templatePath = path.join(
    PROJECT_ROOT,
    "landing-src",
    "templates",
    `${templateName}.js`
  );

  if(!fs.existsSync(templatePath)){
    throw new Error(`Missing template: landing-src/templates/${templateName}.js`);
  }

  delete require.cache[require.resolve(templatePath)];

  const template = require(templatePath);

  if(typeof template !== "function"){
    throw new Error(`Template ${templateName} must export a function`);
  }

  return template;
}

function buildAll(){
  const validation = validateAll();

  if(validation.errors.length){
    throw new Error(
      `Landing page validation failed:\n- ${validation.errors.join("\n- ")}`
    );
  }

  const generated = [];

  validation.pages.forEach((page)=>{
    const render = loadTemplate(page.template);
    const html = render({
      site: validation.site,
      page: page
    });
    const outputDir = path.join(OUTPUT_ROOT, page.slug);
    const outputPath = path.join(outputDir, "index.html");

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, html, "utf8");

    generated.push({
      slug: page.slug,
      outputPath: path.relative(PROJECT_ROOT, outputPath),
      bytes: Buffer.byteLength(html)
    });
  });

  return generated;
}

module.exports = {
  PROJECT_ROOT,
  OUTPUT_ROOT,
  loadSite,
  loadPages,
  validatePage,
  validateAll,
  buildAll
};
