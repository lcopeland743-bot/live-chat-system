"use strict";

const {
  escapeHtml,
  escapeAttribute,
  safeJson,
  renderCta
} = require("../lib/render-utils");

const signalCards = [
  {
    icon: "M5 17l4-4 4 3 6-8",
    title: "Market Regime",
    copy: "Organize whether conditions appear aggressive, defensive, or uncertain."
  },
  {
    icon: "M4 18V9m6 9V5m6 13v-7m4 7V3",
    title: "Trend Strength",
    copy: "Look beyond direction to ask whether participation and momentum support the move."
  },
  {
    icon: "M7 7h10l-3-3m3 13H7l3 3M5 12h14",
    title: "Sector Rotation",
    copy: "Compare leadership shifts instead of reacting to one isolated stock or headline."
  },
  {
    icon: "M12 3l8 4v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V7l8-4zm0 5v5m0 4h.01",
    title: "Risk Pressure",
    copy: "Identify where volatility, breadth, or market structure may be becoming less supportive."
  }
];

function iconSvg(path){
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`;
}

function renderHeader(site, page){
  return `
  <header class="site-header" data-site-header>
    <div class="shell header-inner">
      <a class="brand" href="#top" aria-label="${escapeAttribute(site.brand)} home">
        <span class="brand-mark" aria-hidden="true">M</span>
        <span>${escapeHtml(site.brand)}</span>
      </a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="primary-navigation" data-menu-button>
        <span></span><span></span><span></span><span class="sr-only">Open menu</span>
      </button>
      <nav class="primary-nav" id="primary-navigation" data-primary-nav aria-label="Primary navigation">
        <a href="#framework">Framework</a>
        <a href="#how-it-works">How it works</a>
        <a href="#questions">Questions</a>
        ${renderCta({
          label: "Start Market Chat",
          question: page.hero.question,
          ctaId: "nav-primary",
          className: "button button-small button-primary"
        })}
      </nav>
    </div>
  </header>`;
}

function renderAuthorityHero(page){
  return `
    <section class="hero hero-authority" aria-labelledby="hero-title">
      <div class="shell hero-grid">
        <div class="hero-copy" data-reveal>
          <div class="eyebrow"><span></span>${escapeHtml(page.hero.eyebrow)}</div>
          <h1 id="hero-title">${escapeHtml(page.hero.title)}</h1>
          <p class="hero-subtitle">${escapeHtml(page.hero.subtitle)}</p>
          <div class="hero-actions">
            ${renderCta({ label: page.hero.primaryCta, question: page.hero.question, ctaId: "hero-primary" })}
            <a class="button button-secondary" href="#framework" data-cta-id="hero-secondary">${escapeHtml(page.hero.secondaryCta)}</a>
          </div>
          <p class="micro-disclosure">Educational research experience. No recommendations or guaranteed outcomes.</p>
        </div>
        <div class="hero-visual" data-reveal>
          <div class="hero-image-card">
            <img src="/assets/landing/factory/market-clarity-hero.webp" width="1448" height="1086" fetchpriority="high" decoding="async" alt="Abstract AI market research system with connected market signals">
            <div class="signal-chip signal-chip-one">Market regime</div>
            <div class="signal-chip signal-chip-two">Risk pressure</div>
            <div class="signal-chip signal-chip-three">Sector rotation</div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderQuestionsHero(page){
  return `
    <section class="hero hero-questions" aria-labelledby="hero-title">
      <div class="shell questions-hero-inner">
        <div class="questions-heading" data-reveal>
          <div class="eyebrow"><span></span>${escapeHtml(page.hero.eyebrow)}</div>
          <h1 id="hero-title">${escapeHtml(page.hero.title)}</h1>
          <p class="hero-subtitle">${escapeHtml(page.hero.subtitle)}</p>
          <div class="hero-actions hero-actions-centered">
            ${renderCta({ label: page.hero.primaryCta, question: page.hero.question, ctaId: "hero-primary" })}
            <a class="button button-secondary" href="#questions" data-cta-id="hero-secondary">${escapeHtml(page.hero.secondaryCta)}</a>
          </div>
        </div>
        <div class="question-hero-grid" id="questions">
          ${page.prompts.map((prompt, index)=>`
            <button
              type="button"
              class="question-tile"
              data-meridian-chat
              data-question="${escapeAttribute(prompt)}"
              data-cta-id="hero-question-${index + 1}"
              data-reveal
            >
              <span class="question-number">0${index + 1}</span>
              <strong>${escapeHtml(prompt)}</strong>
              <span class="question-arrow" aria-hidden="true">↗</span>
            </button>`).join("")}
        </div>
        <p class="micro-disclosure centered">Educational research experience. No recommendations or guaranteed outcomes.</p>
      </div>
    </section>`;
}

function renderDemoHero(page){
  return `
    <section class="hero hero-demo" aria-labelledby="hero-title">
      <div class="shell hero-grid hero-grid-demo">
        <div class="hero-copy" data-reveal>
          <div class="eyebrow"><span></span>${escapeHtml(page.hero.eyebrow)}</div>
          <h1 id="hero-title">${escapeHtml(page.hero.title)}</h1>
          <p class="hero-subtitle">${escapeHtml(page.hero.subtitle)}</p>
          <div class="hero-actions">
            ${renderCta({ label: page.hero.primaryCta, question: page.hero.question, ctaId: "hero-primary" })}
            <a class="button button-secondary" href="#how-it-works" data-cta-id="hero-secondary">${escapeHtml(page.hero.secondaryCta)}</a>
          </div>
          <p class="micro-disclosure">Educational research experience. No recommendations or guaranteed outcomes.</p>
        </div>
        <div class="demo-window" data-reveal aria-label="Example AI market research conversation">
          <div class="demo-header">
            <div class="demo-avatar">M</div>
            <div><strong>Meridian Market Assistant</strong><span>Structured market research</span></div>
            <span class="online-dot" aria-label="Online"></span>
          </div>
          <div class="demo-messages">
            <div class="demo-message user">Which sectors look stronger right now?</div>
            <div class="demo-message assistant">I would compare sector leadership across momentum, breadth, and consistency—then check whether the broader market supports that leadership.</div>
            <div class="demo-insight-grid">
              <div><span>01</span><strong>Trend</strong><small>Is momentum supported?</small></div>
              <div><span>02</span><strong>Breadth</strong><small>Is participation broad?</small></div>
              <div><span>03</span><strong>Risk</strong><small>Is pressure increasing?</small></div>
            </div>
          </div>
          <button type="button" class="demo-composer" data-meridian-chat data-question="${escapeAttribute(page.hero.question)}" data-cta-id="demo-composer">
            <span>Ask a market question…</span><b aria-hidden="true">➤</b>
          </button>
        </div>
      </div>
    </section>`;
}

function renderHero(page){
  if(page.layout === "questions") return renderQuestionsHero(page);
  if(page.layout === "demo") return renderDemoHero(page);
  return renderAuthorityHero(page);
}

function renderFramework(page){
  return `
    <section class="section framework-section" id="framework">
      <div class="shell">
        <div class="section-heading" data-reveal>
          <span class="section-kicker">A clearer research framework</span>
          <h2>Read the market through four connected layers.</h2>
          <p>Each layer answers a different question. Together, they create a more organized starting point for further research.</p>
        </div>
        <div class="signal-grid">
          ${signalCards.map((card, index)=>`
            <article class="signal-card" data-reveal>
              <div class="signal-icon">${iconSvg(card.icon)}</div>
              <span class="card-index">0${index + 1}</span>
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.copy)}</p>
              <button type="button" class="text-link" data-meridian-chat data-question="Explain ${escapeAttribute(card.title.toLowerCase())} in the current market." data-cta-id="framework-${index + 1}">Ask about this layer <span>→</span></button>
            </article>`).join("")}
        </div>
      </div>
    </section>`;
}

function renderHowItWorks(page){
  const steps = [
    ["Ask", "Start with a focused question about the market, a sector, risk, or investor context."],
    ["Organize", "The assistant structures the question across the relevant market research layers."],
    ["Continue", "Use follow-up questions to clarify what matters instead of stopping at one generic answer."]
  ];

  return `
    <section class="section process-section" id="how-it-works">
      <div class="shell process-layout">
        <div class="section-heading sticky-heading" data-reveal>
          <span class="section-kicker">How it works</span>
          <h2>From a broad market question to a structured conversation.</h2>
          <p>The experience is designed to help users frame research—not to replace independent judgment or professional advice.</p>
          ${renderCta({ label: "Start a Structured Market Chat", question: page.hero.question, ctaId: "process-primary" })}
        </div>
        <div class="process-steps">
          ${steps.map((step, index)=>`
            <article class="process-step" data-reveal>
              <span class="step-number">0${index + 1}</span>
              <div><h3>${escapeHtml(step[0])}</h3><p>${escapeHtml(step[1])}</p></div>
            </article>`).join("")}
        </div>
      </div>
    </section>`;
}

function renderPromptSection(page){
  return `
    <section class="section prompt-section" id="questions">
      <div class="shell prompt-layout">
        <div class="prompt-copy" data-reveal>
          <span class="section-kicker">Suggested starting points</span>
          <h2>Bring the question you are already thinking about.</h2>
          <p>These prompts open the same live Meridian chat system used across every landing-page version.</p>
        </div>
        <div class="prompt-list">
          ${page.prompts.map((prompt, index)=>`
            <button type="button" class="prompt-row" data-meridian-chat data-question="${escapeAttribute(prompt)}" data-cta-id="prompt-${index + 1}" data-reveal>
              <span>0${index + 1}</span><strong>${escapeHtml(prompt)}</strong><b aria-hidden="true">↗</b>
            </button>`).join("")}
        </div>
      </div>
    </section>`;
}

function renderTrustSection(site, page){
  return `
    <section class="section trust-section">
      <div class="shell trust-card" data-reveal>
        <div>
          <span class="section-kicker">Built for clarity—not promises</span>
          <h2>Research support should help organize information without hiding uncertainty.</h2>
        </div>
        <div class="trust-points">
          <div><span>✓</span><p>Plain-language market explanations</p></div>
          <div><span>✓</span><p>Transparent educational positioning</p></div>
          <div><span>✓</span><p>No guaranteed returns or “risk-free” claims</p></div>
          <div><span>✓</span><p>One stable live-chat system across every page</p></div>
        </div>
        <div class="final-cta">
          <p>${escapeHtml(site.disclosure)}</p>
          ${renderCta({ label: page.hero.primaryCta, question: page.hero.question, ctaId: "final-primary" })}
        </div>
      </div>
    </section>`;
}

function renderFooter(site){
  const year = new Date().getUTCFullYear();
  return `
  <footer class="site-footer">
    <div class="shell footer-inner">
      <div><strong>${escapeHtml(site.brand)}</strong><p>${escapeHtml(site.disclosure)}</p></div>
      <p>© ${year} ${escapeHtml(site.copyright)}.</p>
    </div>
  </footer>`;
}

function renderXPixel(pixelId){
  if(!pixelId) return "";
  return `
  <script>
  !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
  twq('config','${escapeAttribute(pixelId)}');
  </script>`;
}

module.exports = function renderMarketClarity({ site, page }){
  const canonical = `${String(site.baseUrl).replace(/\/$/, "")}/lp/${page.slug}/index.html`;
  const context = {
    pageId: page.pageId,
    pageFamily: page.pageFamily,
    variantId: page.variantId,
    audience: page.audience,
    campaignId: page.campaignId,
    whatsappRouteKey: page.whatsappRouteKey,
    pageVersion: page.pageVersion,
    templateId: page.template,
    theme: page.theme
  };

  return `<!doctype html>
<html lang="${escapeAttribute(site.locale)}" data-theme="${escapeAttribute(page.theme || site.defaultTheme)}" data-layout="${escapeAttribute(page.layout)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(page.seo.title)}</title>
  <meta name="description" content="${escapeAttribute(page.seo.description)}">
  <link rel="canonical" href="${escapeAttribute(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttribute(page.seo.title)}">
  <meta property="og:description" content="${escapeAttribute(page.seo.description)}">
  <meta property="og:url" content="${escapeAttribute(canonical)}">
  <meta property="og:image" content="${escapeAttribute(site.baseUrl)}/assets/landing/factory/market-clarity-hero.webp">
  <meta name="twitter:card" content="summary_large_image">
  ${page.layout === "authority" ? '<link rel="preload" as="image" href="/assets/landing/factory/market-clarity-hero.webp" type="image/webp" fetchpriority="high">' : ''}
  <script>document.documentElement.classList.add("js");</script>
  <link rel="stylesheet" href="/css/landing-factory.css">
  <script>window.MeridianLandingContext = Object.freeze(${safeJson(context)});</script>
  ${renderXPixel(site.xPixelId)}
  <script src="/js/landing-page-runtime.js" defer></script>
  <script src="/js/meridian-landing-loader.js?v=20260806-2" data-meridian-asset-version="20260806-2" data-meridian-load="idle" defer></script>
</head>
<body id="top">
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${renderHeader(site, page)}
  <main id="main-content">
    ${renderHero(page)}
    <div class="research-strip" aria-label="Research dimensions">
      <div class="shell research-strip-inner"><span>Market Regime</span><i></i><span>Trend Strength</span><i></i><span>Sector Rotation</span><i></i><span>Risk Pressure</span></div>
    </div>
    ${renderFramework(page)}
    ${renderHowItWorks(page)}
    ${page.layout === "questions" ? "" : renderPromptSection(page)}
    ${renderTrustSection(site, page)}
  </main>
  ${renderFooter(site)}
</body>
</html>`;
};
