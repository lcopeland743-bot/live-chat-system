const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const cssPath = path.join(projectRoot, "public", "css", "chat.css");
const uiPath = path.join(projectRoot, "public", "js", "ui", "chat-ui.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const css = fs.readFileSync(cssPath, "utf8");
const ui = fs.readFileSync(uiPath, "utf8");

assert(
  css.includes("@media (max-width: 768px)"),
  "Missing mobile breakpoint."
);

assert(
  css.includes(".meridian-chat.mobile-active .meridian-chat-panel.active"),
  "Missing mobile full-screen panel rule."
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
  css.includes("body.meridian-chat-open"),
  "Missing landing-page scroll lock."
);

assert(
  ui.includes("startMobileFullscreen"),
  "Missing mobile full-screen activation."
);

assert(
  ui.includes("stopMobileFullscreen"),
  "Missing mobile full-screen cleanup."
);

assert(
  ui.includes("window.visualViewport"),
  "Missing mobile keyboard viewport handling."
);

assert(
  ui.includes('"aria-hidden"'),
  "Missing chat dialog visibility state."
);

assert(
  ui.includes("this.renderInvestorChoices();"),
  "Investor choices initialization was unexpectedly removed."
);

assert(
  ui.includes("renderAiExtras"),
  "AI extras/WhatsApp rendering was unexpectedly removed."
);

assert(
  ui.includes("trackWhatsappClick"),
  "WhatsApp click tracking was unexpectedly removed."
);

console.log("Mobile Fullscreen Chat v2.4.2 checks passed.");
