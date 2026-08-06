"use strict";

function escapeHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value){
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function safeJson(value){
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "--\\u003e");
}

function renderCta({ label, question, ctaId, className = "button button-primary" }){
  return `
    <button
      type="button"
      class="${escapeAttribute(className)}"
      data-meridian-chat
      data-question="${escapeAttribute(question)}"
      data-cta-id="${escapeAttribute(ctaId)}"
    >${escapeHtml(label)}</button>`;
}

module.exports = {
  escapeHtml,
  escapeAttribute,
  safeJson,
  renderCta
};
