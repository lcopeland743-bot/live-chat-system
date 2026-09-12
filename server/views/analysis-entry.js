/**
 * Meridian Analysis Entry View
 */

"use strict";

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function documentShell({ title, body, bootstrap = false }) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="robots" content="noindex,nofollow">
  <title>${escapeHtml(title)} | Meridian</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="/css/analysis-entry.css">
</head>
<body>
${body}
${bootstrap ? '  <script src="/js/analysis-entry.js" defer></script>' : ""}
</body>
</html>`;
}

function renderAnalysisEntry(campaign) {
    const context = campaign.landingContext;

    return documentShell({
        title: campaign.title,
        bootstrap: true,
        body: `  <main
    class="analysis-entry-shell"
    id="meridianAnalysisEntry"
    data-campaign-id="${escapeHtml(context.campaignId)}"
    data-page-id="${escapeHtml(context.pageId)}"
    data-page-family="${escapeHtml(context.pageFamily)}"
    data-variant-id="${escapeHtml(context.variantId)}"
    data-campaign-title="${escapeHtml(campaign.title)}"
    data-initial-question="${escapeHtml(campaign.initialQuestion)}"
  >
    <section class="analysis-entry-card" aria-labelledby="analysis-entry-title">
      <div class="analysis-entry-brand"><span aria-hidden="true"></span> Meridian Analysis</div>
      <p class="analysis-entry-kicker">Continue the analysis</p>
      <h1 id="analysis-entry-title">${escapeHtml(campaign.title)}</h1>
      <p id="analysisEntryStatus" class="analysis-entry-status" role="status" aria-live="polite">Preparing the shared analysis chat…</p>
      <button id="analysisEntryRetry" class="analysis-entry-retry" type="button" hidden>Retry chat</button>
      <p class="analysis-entry-note">Educational research support. Review the question before sending.</p>
      <a class="analysis-entry-back" href="${escapeHtml(campaign.landingPath)}">Back to the campaign</a>
    </section>
  </main>`
    });
}

function renderAnalysisEntryError({ title, message }) {
    return documentShell({
        title,
        body: `  <main class="analysis-entry-shell is-error">
    <section class="analysis-entry-card" aria-labelledby="analysis-entry-error-title">
      <div class="analysis-entry-brand"><span aria-hidden="true"></span> Meridian Analysis</div>
      <p class="analysis-entry-kicker">Analysis entry</p>
      <h1 id="analysis-entry-error-title">${escapeHtml(title)}</h1>
      <p class="analysis-entry-status">${escapeHtml(message)}</p>
      <a class="analysis-entry-back" href="/">Return to Meridian</a>
    </section>
  </main>`
    });
}

module.exports = {
    escapeHtml,
    renderAnalysisEntry,
    renderAnalysisEntryError
};
