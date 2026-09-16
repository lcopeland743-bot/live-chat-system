/**
 * Meridian Analysis Entry Bridge Tests
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const express = require("express");

const root = path.resolve(__dirname, "..");

const {
    campaigns,
    getAnalysisCampaign,
    resolveAnalysisLandingContext
} = require(
    "../server/config/analysis-campaign-registry"
);

const analysisEntryRoute = require(
    "../server/routes/analysis-entry-route"
);

const {
    renderAnalysisEntry
} = require("../server/views/analysis-entry");

const campaignLink = require(
    "../public/js/campaign-analysis-entry-link"
);

const expectedQuestion =
    "What assumptions, constraints, and evidence determine whether a robotics system can become economically meaningful work?";

const expectedQuestion001 =
    "What changed behind the move, and what evidence would change your interpretation?";

const expectedQuestion002 =
    "Which constraint—compute, memory, power, grid access, capital, or uncertainty—most limits the path from AI capability to useful scale?";

const expectedQuestion003 =
    "Which weights, shared exposures, and evidence matter most when examining what really carries a broad market-cap-weighted index?";

const expectedContext = {
    pageId: "004-when-machines-become-work",
    pageFamily: "when-machines-become-work",
    variantId: "",
    campaignId: "004"
};

function clone(value) {
    return value == null
        ? value
        : JSON.parse(JSON.stringify(value));
}

function testRegistry() {
    const campaign001 = getAnalysisCampaign("001");
    const campaign002 = getAnalysisCampaign("002");
    const campaign003 = getAnalysisCampaign("003");
    const campaign = getAnalysisCampaign("004");

    assert.ok(campaign001);
    assert.strictEqual(campaign001.campaignName, "Beyond the Headlines");
    assert.strictEqual(campaign001.title, "Beyond the Headlines");
    assert.strictEqual(campaign001.landingPath, "/lp/001-beyond-the-headlines/");
    assert.strictEqual(campaign001.initialQuestion, expectedQuestion001);
    assert.deepStrictEqual(campaign001.landingContext, {
        pageId: "001-beyond-the-headlines",
        pageFamily: "beyond-the-headlines",
        variantId: "",
        campaignId: "001"
    });
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            campaign001.landingContext,
            "whatsappRouteKey"
        ),
        false,
        "Campaign 001 must not invent an unregistered WhatsApp route"
    );
    assert.ok(campaign002);
    assert.strictEqual(campaign002.campaignName, "The AGI Repricing");
    assert.strictEqual(campaign002.title, "The AGI Repricing");
    assert.strictEqual(campaign002.landingPath, "/lp/002-agi-repricing/");
    assert.strictEqual(campaign002.initialQuestion, expectedQuestion002);
    assert.deepStrictEqual(campaign002.landingContext, {
        pageId: "002-agi-repricing",
        pageFamily: "agi-repricing",
        variantId: "",
        campaignId: "002"
    });
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            campaign002.landingContext,
            "whatsappRouteKey"
        ),
        false,
        "Campaign 002 must not invent an unregistered WhatsApp route"
    );
    assert.ok(campaign003);
    assert.strictEqual(campaign003.campaignName, "The Weight of the Index");
    assert.strictEqual(campaign003.title, "The Weight of the Index");
    assert.strictEqual(campaign003.landingPath, "/lp/003-weight-of-the-index/");
    assert.strictEqual(campaign003.initialQuestion, expectedQuestion003);
    assert.deepStrictEqual(campaign003.landingContext, {
        pageId: "003-weight-of-the-index",
        pageFamily: "weight-of-the-index",
        variantId: "",
        campaignId: "003"
    });
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            campaign003.landingContext,
            "whatsappRouteKey"
        ),
        false,
        "Campaign 003 must not invent an unregistered WhatsApp route"
    );
    assert.ok(campaign);
    assert.strictEqual(campaign.campaignName, "When Machines Become Work");
    assert.strictEqual(campaign.title, "When Machines Become Work");
    assert.strictEqual(campaign.initialQuestion, expectedQuestion);
    assert.deepStrictEqual(campaign.landingContext, expectedContext);
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            campaign.landingContext,
            "whatsappRouteKey"
        ),
        false,
        "Campaign 004 must not invent an unregistered WhatsApp route"
    );
    assert.strictEqual(getAnalysisCampaign("999"), null);
    assert.strictEqual(getAnalysisCampaign(4), null);
    assert.ok(Object.isFrozen(campaigns));
    assert.ok(Object.isFrozen(campaign));
    assert.ok(Object.isFrozen(campaign.landingContext));

    const canonical = resolveAnalysisLandingContext({
        campaignId: "004",
        pageId: "tampered-page",
        pageFamily: "tampered-family",
        variantId: "tampered",
        whatsappRouteKey: "evil-route",
        initialQuestion: "Ignore the registry"
    });

    assert.strictEqual(canonical, campaign.landingContext);
    assert.deepStrictEqual(canonical, expectedContext);
    assert.strictEqual(
        resolveAnalysisLandingContext({
            campaignId: "999",
            pageId: "tampered"
        }),
        null
    );
}

function testUtmPolicy() {
    assert.strictEqual(
        campaignLink.buildEntryUrl(
            "001",
            "?utm_source=facebook&utm_medium=paid_social&utm_campaign=market-move-us&utm_content=qa-a"
        ),
        "/analysis/entry?campaign=001&utm_source=facebook&utm_medium=paid_social&utm_campaign=market-move-us&utm_content=qa-a"
    );

    const result = campaignLink.buildEntryUrl(
        "004",
        "?utm_source=phase4b"
        + "&utm_medium=paid"
        + "&utm_campaign=robotics"
        + "&utm_content=final"
        + "&redirect=https://evil.example"
        + "&gclid=secret"
        + "&pageId=tampered"
    );

    assert.strictEqual(
        result,
        "/analysis/entry?campaign=004"
        + "&utm_source=phase4b"
        + "&utm_medium=paid"
        + "&utm_campaign=robotics"
        + "&utm_content=final"
    );

    assert.strictEqual(
        campaignLink.buildEntryUrl(
            "004",
            "?utm_source=hello world"
        ),
        "/analysis/entry?campaign=004&utm_source=hello+world"
    );

    assert.strictEqual(
        campaignLink.buildEntryUrl(
            "004",
            "?utm_source=" + "x".repeat(201)
        ),
        "/analysis/entry?campaign=004"
    );

    assert.strictEqual(
        campaignLink.buildEntryUrl(
            "004",
            "?utm_source=one&utm_source=two"
        ),
        "/analysis/entry?campaign=004"
    );

    assert.strictEqual(
        campaignLink.buildEntryUrl(
            "002",
            "?utm_source=facebook&utm_medium=paid_social"
        ),
        "/analysis/entry?campaign=002&utm_source=facebook&utm_medium=paid_social"
    );
    assert.strictEqual(
        campaignLink.buildEntryUrl(
            "003",
            "?utm_source=facebook&utm_campaign=index-weight-us"
        ),
        "/analysis/entry?campaign=003&utm_source=facebook&utm_campaign=index-weight-us"
    );
    assert.strictEqual(campaignLink.buildEntryUrl("invalid", ""), "");
}

function testCampaignBridge() {
    const triggers = Array.from({ length: 5 }, () => ({
        attributes: {
            href: "/analysis/entry?campaign=004"
        },
        getAttribute(name) {
            return this.attributes[name] || null;
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        }
    }));

    const windowObject = {
        location: {
            href:
                "http://127.0.0.1:3000/lp/004-when-machines-become-work/"
                + "?utm_source=phase4b",
            search:
                "?utm_source=phase4b"
                + "&utm_medium=paid"
                + "&utm_campaign=robotics"
                + "&utm_content=final"
        },
        addEventListener() {}
    };

    const documentObject = {
        readyState: "complete",
        querySelectorAll(selector) {
            assert.strictEqual(selector, "[data-meridian-chat]");
            return triggers;
        },
        addEventListener() {}
    };

    campaignLink.init(windowObject, documentObject);

    assert.deepStrictEqual(
        windowObject.MeridianLandingContext,
        { campaignId: "004" }
    );
    assert.ok(Object.isFrozen(windowObject.MeridianLandingContext));

    triggers.forEach((trigger) => {
        assert.strictEqual(
            trigger.attributes.href,
            "/analysis/entry?campaign=004"
            + "&utm_source=phase4b"
            + "&utm_medium=paid"
            + "&utm_campaign=robotics"
            + "&utm_content=final"
        );
    });
}

function testViewEscaping() {
    const html = renderAnalysisEntry({
        title: "<Campaign>",
        landingPath: "/safe",
        initialQuestion: "&quot;\"<script>alert(1)</script>",
        landingContext: expectedContext
    });

    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /src="\/js\/analysis-entry\.js"/);
}

async function withRouteServer(run) {
    const app = express();
    app.use(analysisEntryRoute);

    const server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => {
            resolve(listener);
        });
    });

    try {
        const address = server.address();
        await run(`http://127.0.0.1:${address.port}`);
    }
    finally {
        await new Promise((resolve, reject) => {
            server.close((error) => (
                error ? reject(error) : resolve()
            ));
        });
    }
}

async function testRoute() {
    await withRouteServer(async (baseUrl) => {
        async function request(pathname) {
            return fetch(baseUrl + pathname, {
                redirect: "manual"
            });
        }

        let response = await request(
            "/analysis/entry?campaign=004"
        );
        let body = await response.text();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.headers.get("location"), null);
        assert.match(body, /data-campaign-id="004"/);
        assert.match(body, /data-page-id="004-when-machines-become-work"/);
        assert.ok(body.includes(expectedQuestion));
        assert.doesNotMatch(body, /data-whatsapp-route-key/);
        assert.match(
            response.headers.get("cache-control"),
            /no-store/
        );
        assert.strictEqual(
            response.headers.get("x-content-type-options"),
            "nosniff"
        );
        assert.strictEqual(
            response.headers.get("referrer-policy"),
            "strict-origin-when-cross-origin"
        );
        assert.match(
            response.headers.get("content-security-policy"),
            /script-src 'self'/
        );
        assert.doesNotMatch(
            response.headers.get("content-security-policy"),
            /script-src[^;]*unsafe-inline/
        );

        response = await request(
            "/analysis/entry?campaign=001"
        );
        body = await response.text();
        assert.strictEqual(response.status, 200);
        assert.match(body, /data-campaign-id="001"/);
        assert.match(body, /data-page-id="001-beyond-the-headlines"/);
        assert.ok(body.includes(expectedQuestion001));
        assert.doesNotMatch(body, /data-whatsapp-route-key/);

        response = await request(
            "/analysis/entry?campaign=002"
        );
        body = await response.text();
        assert.strictEqual(response.status, 200);
        assert.match(body, /data-campaign-id="002"/);
        assert.match(body, /data-page-id="002-agi-repricing"/);
        assert.ok(body.includes(expectedQuestion002));
        assert.doesNotMatch(body, /data-whatsapp-route-key/);

        response = await request(
            "/analysis/entry?campaign=003"
        );
        body = await response.text();
        assert.strictEqual(response.status, 200);
        assert.match(body, /data-campaign-id="003"/);
        assert.match(body, /data-page-id="003-weight-of-the-index"/);
        assert.ok(body.includes(expectedQuestion003));
        assert.doesNotMatch(body, /data-whatsapp-route-key/);

        response = await request("/analysis/entry");
        assert.strictEqual(response.status, 400);

        response = await request(
            "/analysis/entry?campaign=004&campaign=004"
        );
        assert.strictEqual(response.status, 400);

        response = await request(
            "/analysis/entry?campaign=../../foo"
        );
        assert.strictEqual(response.status, 400);

        response = await request(
            "/analysis/entry?campaign=" + "0".repeat(17)
        );
        assert.strictEqual(response.status, 400);

        response = await request(
            "/analysis/entry?campaign=999"
        );
        assert.strictEqual(response.status, 404);

        response = await request(
            "/analysis/entry?campaign=004"
            + "&redirect=https://evil.example"
            + "&pageId=tampered"
            + "&initialQuestion=tampered"
            + "&autoSend=true"
        );
        body = await response.text();
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.headers.get("location"), null);
        assert.doesNotMatch(body, /evil\.example|data-page-id="tampered"|autoSend=true/);
        assert.ok(body.includes(expectedQuestion));
    });
}

async function testFirstTouchSessionContext() {
    const modelPath = require.resolve(
        "../server/database/models/session-model"
    );
    const servicePath = require.resolve(
        "../server/services/session-service"
    );
    const originalModel = require.cache[modelPath];
    const originalService = require.cache[servicePath];

    let existingSession = null;
    let lastUpdate = null;

    const fakeModel = {
        findOne() {
            return {
                select() {
                    return {
                        async lean() {
                            return clone(existingSession);
                        }
                    };
                }
            };
        },
        async findOneAndUpdate(filter, update) {
            lastUpdate = clone(update);
            return {
                ...(clone(existingSession) || {}),
                ...(clone(update.$setOnInsert) || {}),
                ...(clone(update.$set) || {})
            };
        }
    };

    require.cache[modelPath] = {
        id: modelPath,
        filename: modelPath,
        loaded: true,
        exports: fakeModel,
        children: [],
        paths: []
    };
    delete require.cache[servicePath];

    try {
        const sessionService = require(servicePath);
        const canonical = resolveAnalysisLandingContext({
            campaignId: "004",
            pageId: "tampered",
            whatsappRouteKey: "evil"
        });

        existingSession = {
            userId: "user_existing1",
            conversationId: "conversation_same0001",
            landingContext: {}
        };

        await sessionService.createSession({
            userId: existingSession.userId,
            conversationId: existingSession.conversationId,
            allowConversationReset: false,
            landingContext: canonical
        });

        assert.deepStrictEqual(
            {
                pageId: lastUpdate.$set.landingContext.pageId,
                pageFamily: lastUpdate.$set.landingContext.pageFamily,
                variantId: lastUpdate.$set.landingContext.variantId,
                campaignId: lastUpdate.$set.landingContext.campaignId
            },
            expectedContext
        );
        assert.strictEqual(
            lastUpdate.$set.landingContext.whatsappRouteKey,
            "",
            "Campaign 004 must not infer a WhatsApp binding from its page ID"
        );

        existingSession = {
            userId: "user_existing1",
            conversationId: "conversation_same0001",
            landingContext: {
                pageId: "market-clarity-a",
                pageFamily: "market-clarity",
                variantId: "a",
                campaignId: "us-market-clarity-a",
                whatsappRouteKey: "market-clarity-a"
            }
        };

        await sessionService.createSession({
            userId: existingSession.userId,
            conversationId: existingSession.conversationId,
            allowConversationReset: false,
            landingContext: canonical
        });

        assert.strictEqual(
            Object.prototype.hasOwnProperty.call(
                lastUpdate.$set,
                "landingContext"
            ),
            false,
            "an active conversation's established context must not be overwritten"
        );
    }
    finally {
        if (originalModel) {
            require.cache[modelPath] = originalModel;
        }
        else {
            delete require.cache[modelPath];
        }

        if (originalService) {
            require.cache[servicePath] = originalService;
        }
        else {
            delete require.cache[servicePath];
        }
    }
}

function testSourceIntegration() {
    const read = (relativePath) => fs.readFileSync(
        path.join(root, relativePath),
        "utf8"
    );

    const bootstrap = read("public/js/analysis-entry.js");
    const campaignBridge = read(
        "public/js/campaign-analysis-entry-link.js"
    );
    const landingLoader = read(
        "public/js/meridian-landing-loader.js"
    );
    const clientPresence = read("public/js/core/presence.js");
    const serverPresence = read("server/socket/presence-handler.js");
    const campaignHtml = read(
        "public/lp/004-when-machines-become-work/index.html"
    );
    const campaign001Html = read(
        "public/lp/001-beyond-the-headlines/index.html"
    );
    const campaign002Html = read(
        "public/lp/002-agi-repricing/index.html"
    );
    const campaign003Html = read(
        "public/lp/003-weight-of-the-index/index.html"
    );
    const renderedCampaignHtml = campaignHtml.slice(
        0,
        campaignHtml.indexOf("</main>") + "</main>".length
    );
    const renderedCampaign001Html = campaign001Html.slice(
        0,
        campaign001Html.indexOf("</main>") + "</main>".length
    );
    const renderedCampaign002Html = campaign002Html.slice(
        0,
        campaign002Html.indexOf("</main>") + "</main>".length
    );
    const renderedCampaign003Html = campaign003Html.slice(
        0,
        campaign003Html.indexOf("</main>") + "</main>".length
    );

    assert.match(bootstrap, /loader\.open\(\{/);
    assert.match(bootstrap, /autoSend:\s*false/);
    assert.doesNotMatch(bootstrap, /handleSend\s*\(/);
    assert.match(clientPresence, /onlinePayload\.landingContext/);
    assert.match(serverPresence, /resolveAnalysisLandingContext/);
    assert.match(
        serverPresence,
        /createSession\(\{[\s\S]*landingContext/
    );
    assert.match(
        campaignHtml,
        /src="\/js\/campaign-analysis-entry-link\.js"/
    );
    assert.strictEqual(
        (renderedCampaignHtml.match(/data-meridian-chat(?:="")?/g) || []).length,
        5,
        "Campaign 004 must render exactly five shared Chat entry points"
    );
    assert.strictEqual(
        (renderedCampaignHtml.match(/data-meridian-floating-entry(?:="")?/g) || []).length,
        1,
        "Campaign 004 must render exactly one Campaign floating launcher"
    );
    assert.strictEqual(
        (renderedCampaignHtml.match(/data-meridian-auto-send="false"/g) || []).length,
        5,
        "every Campaign 004 Chat entry must disable auto-send"
    );
    assert.strictEqual(
        (renderedCampaignHtml.match(new RegExp(
            expectedQuestion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
        )) || []).length,
        5,
        "every Campaign 004 Chat entry must carry the reviewed question"
    );
    assert.strictEqual(
        (renderedCampaignHtml.match(/href="\/analysis\/entry\?campaign=004"/g) || []).length,
        5,
        "all Campaign 004 Chat entries must retain the canonical fallback"
    );
    assert.match(
        renderedCampaignHtml,
        /href="#thesis"[^>]*>Trace the economics/,
        "the Hero CTA must remain in-page navigation"
    );
    assert.match(
        renderedCampaignHtml,
        /robotic-workcell-system-economics-v2\.png/,
        "the current workcell SYSTEM / ECONOMICS image must be present"
    );
    assert.match(campaignBridge, /findCampaignTriggers/);
    assert.match(campaignBridge, /setLandingContext/);
    assert.match(campaignBridge, /resolveCampaignId/);
    assert.match(campaignBridge, /getCampaignIdFromTrigger/);
    assert.doesNotMatch(
        campaignBridge,
        /campaignId:\s*"00[1234]"/,
        "the shared Campaign bridge must not hard-code Campaign identity"
    );
    assert.doesNotMatch(campaignBridge, /handleSend\s*\(/);
    assert.match(
        landingLoader,
        /autoSend\s*&&[\s\S]*chatUI\.handleSend\(\)/,
        "the shared loader may send only after an explicit true autoSend value"
    );
    assert.match(
        landingLoader,
        /window\.__MeridianLandingLoaderState/,
        "the shared loader must reuse one SDK initialization"
    );

    assert.strictEqual(
        (renderedCampaign001Html.match(/data-meridian-chat(?:="")?/g) || []).length,
        5,
        "Campaign 001 must render exactly five shared Chat entry points"
    );
    assert.strictEqual(
        (renderedCampaign001Html.match(/data-meridian-floating-entry(?:="")?/g) || []).length,
        1,
        "Campaign 001 must render exactly one Campaign floating launcher"
    );
    assert.strictEqual(
        (renderedCampaign001Html.match(/data-meridian-auto-send="false"/g) || []).length,
        5,
        "every Campaign 001 Chat entry must disable auto-send"
    );
    assert.strictEqual(
        (renderedCampaign001Html.match(new RegExp(
            expectedQuestion001.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
        )) || []).length,
        5,
        "every Campaign 001 Chat entry must carry the reviewed question"
    );
    assert.strictEqual(
        (renderedCampaign001Html.match(/href="\/analysis\/entry\?campaign=001"/g) || []).length,
        5,
        "all Campaign 001 Chat entries must retain the canonical fallback"
    );
    assert.match(
        renderedCampaign001Html,
        /href="#discovery"[^>]*>Trace what changed/,
        "the Campaign 001 Hero CTA must remain in-page narrative progression"
    );

    assert.strictEqual(
        (renderedCampaign002Html.match(/data-meridian-chat(?:="")?/g) || []).length,
        5,
        "Campaign 002 must render exactly five shared Chat entry points"
    );
    assert.strictEqual(
        (renderedCampaign002Html.match(/data-meridian-floating-entry(?:="")?/g) || []).length,
        1,
        "Campaign 002 must render exactly one Campaign floating launcher"
    );
    assert.strictEqual(
        (renderedCampaign002Html.match(/data-meridian-auto-send="false"/g) || []).length,
        5,
        "every Campaign 002 Chat entry must disable auto-send"
    );
    assert.strictEqual(
        (renderedCampaign002Html.match(new RegExp(
            expectedQuestion002.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
        )) || []).length,
        5,
        "every Campaign 002 Chat entry must carry the reviewed question"
    );
    assert.strictEqual(
        (renderedCampaign002Html.match(/href="\/analysis\/entry\?campaign=002"/g) || []).length,
        5,
        "all Campaign 002 Chat entries must retain the canonical fallback"
    );
    assert.strictEqual(
        (renderedCampaign003Html.match(/data-meridian-chat(?:="")?/g) || []).length,
        5,
        "Campaign 003 must render exactly five shared Chat entry points"
    );
    assert.strictEqual(
        (renderedCampaign003Html.match(/data-meridian-floating-entry(?:="")?/g) || []).length,
        1,
        "Campaign 003 must render exactly one Campaign floating launcher"
    );
    assert.strictEqual(
        (renderedCampaign003Html.match(/data-meridian-auto-send="false"/g) || []).length,
        5,
        "every Campaign 003 Chat entry must disable auto-send"
    );
    assert.strictEqual(
        (renderedCampaign003Html.match(new RegExp(
            expectedQuestion003.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
        )) || []).length,
        5,
        "every Campaign 003 Chat entry must carry the reviewed question"
    );
    assert.strictEqual(
        (renderedCampaign003Html.match(/href="\/analysis\/entry\?campaign=003"/g) || []).length,
        5,
        "all Campaign 003 Chat entries must retain the canonical fallback"
    );
}

async function run() {
    testRegistry();
    testUtmPolicy();
    testCampaignBridge();
    testViewEscaping();
    await testRoute();
    await testFirstTouchSessionContext();
    testSourceIntegration();

    console.log(
        "[PASS] Analysis entry bridge tests passed."
    );
}

run().catch((error) => {
    console.error(
        "[FAIL] Analysis entry bridge tests failed."
    );
    console.error(error);
    process.exitCode = 1;
});
