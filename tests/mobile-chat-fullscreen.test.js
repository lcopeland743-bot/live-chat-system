const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const cssPath = path.join(projectRoot, "public", "css", "chat.css");
const uiPath = path.join(projectRoot, "public", "js", "ui", "chat-ui.js");
const embedPath = path.join(projectRoot, "public", "js", "embed.js");
const landingPages = [
  "market-clarity-a",
  "market-clarity-b",
  "market-clarity-c",
  "002-agi-repricing",
  "003-weight-of-the-index",
  "004-when-machines-become-work"
].map((slug)=>path.join(
  projectRoot,
  "public",
  "lp",
  slug,
  "index.html"
));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const css = fs.readFileSync(cssPath, "utf8");
const ui = fs.readFileSync(uiPath, "utf8");
const embed = fs.readFileSync(embedPath, "utf8");

assert(
  css.includes(".meridian-chat.mobile-active .meridian-chat-panel.active"),
  "Missing class-driven mobile full-screen panel rule."
);

assert(
  css.includes("html.meridian-chat-open") &&
  css.includes("body.meridian-chat-open"),
  "Missing landing-page scroll lock."
);

assert(
  css.indexOf(".meridian-chat.mobile-active .meridian-chat-panel.active") <
  css.indexOf("@media (max-width: 900px)"),
  "The critical full-screen panel rule must not depend on a CSS width query."
);

assert(
  css.includes("--meridian-chat-viewport-height"),
  "Missing dynamic viewport height support."
);

assert(
  css.includes("env(safe-area-inset-bottom)"),
  "Missing mobile safe-area support."
);

assert(
  ui.includes("mobileBreakpoint:900"),
  "Missing widened mobile viewport breakpoint."
);

assert(
  ui.includes("mobileTouchBreakpoint:1024"),
  "Missing touch-device compatibility breakpoint."
);

assert(
  ui.includes("navigator.maxTouchPoints") &&
  ui.includes("navigator.userAgentData") &&
  ui.includes("mobileUserAgent"),
  "Missing robust mobile/in-app-browser detection."
);

assert(
  ui.includes("startMobileFullscreen") &&
  ui.includes("stopMobileFullscreen") &&
  ui.includes("window.visualViewport"),
  "Missing mobile full-screen lifecycle support."
);

const closeMethod = ui.slice(
  ui.indexOf("  close(){"),
  ui.indexOf("  handleSend(){")
);

assert(
  closeMethod.includes("loaderState.lastTrigger") &&
  closeMethod.indexOf("returnFocus.focus") <
  closeMethod.indexOf('"aria-hidden"'),
  "Chat close must restore focus outside the panel before hiding the dialog."
);

assert(
  embed.includes("MOBILE_FULLSCREEN_ASSET_VERSION") &&
  embed.includes('"/css/chat.css?v="') &&
  embed.includes('src === "/js/ui/chat-ui.js"'),
  "Missing cache-busting for mobile full-screen assets."
);

landingPages.forEach((pagePath)=>{
  const html = fs.readFileSync(pagePath, "utf8");

  assert(
    /<meta\s+name="viewport"\s+content="[^"]*width=device-width/i.test(html),
    `Missing mobile viewport metadata in ${path.relative(projectRoot, pagePath)}.`
  );

  assert(
    html.includes("/js/meridian-landing-loader.js"),
    `Missing shared landing loader in ${path.relative(projectRoot, pagePath)}.`
  );
});

assert(
  ui.includes("this.renderInvestorChoices();"),
  "Investor choices initialization was unexpectedly removed."
);

assert(
  ui.includes("renderAiExtras") && ui.includes("trackWhatsappClick"),
  "WhatsApp rendering or click tracking was unexpectedly removed."
);

console.log("Mobile fullscreen compatibility hardening checks passed.");
