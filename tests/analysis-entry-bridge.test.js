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
    const campaign = getAnalysisCampaign("004");

    assert.ok(campaign);
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
    const result = campaignLink.buildEntryUrl(
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
            "?utm_source=hello world"
        ),
        "/analysis/entry?campaign=004&utm_source=hello+world"
    );

    assert.strictEqual(
        campaignLink.buildEntryUrl(
            "?utm_source=" + "x".repeat(201)
        ),
        "/analysis/entry?campaign=004"
    );

    assert.strictEqual(
        campaignLink.buildEntryUrl(
            "?utm_source=one&utm_source=two"
        ),
        "/analysis/entry?campaign=004"
    );
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
    const clientPresence = read("public/js/core/presence.js");
    const serverPresence = read("server/socket/presence-handler.js");
    const campaignHtml = read(
        "public/lp/004-when-machines-become-work/index.html"
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
}

async function run() {
    testRegistry();
    testUtmPolicy();
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
