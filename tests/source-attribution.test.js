/**
 * Meridian Admin Source Attribution Tests
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

const {
    getAnalysisCampaign,
    resolveAnalysisLandingContext
} = require(
    "../server/config/analysis-campaign-registry"
);

const {
    MAX_UTM_LENGTH,
    normalizeApprovedUtm,
    attachApprovedUtm,
    buildSourceAttribution,
    serializeAdminSession
} = require(
    "../server/services/source-attribution-service"
);


function clone(value) {
    return value == null
        ? value
        : JSON.parse(JSON.stringify(value));
}


function testTrustedSerialization() {
    const campaign002 =
        getAnalysisCampaign("002");
    const campaign003 =
        getAnalysisCampaign("003");
    const campaign =
        getAnalysisCampaign("004");

    assert.ok(campaign002);
    assert.strictEqual(
        campaign002.landingPath,
        "/lp/002-agi-repricing/"
    );
    assert.deepStrictEqual(
        buildSourceAttribution({
            landingContext: {
                campaignId: "002",
                pageId: "browser-tampered-page",
                pageFamily: "browser-tampered-family",
                utmSource: "facebook",
                utmMedium: "paid_social",
                utmCampaign: "agi-repricing-us",
                utmContent: "qa-a"
            }
        }),
        {
            campaignId: "002",
            campaignName: "The AGI Repricing",
            landingPath: "/lp/002-agi-repricing/",
            pageId: "002-agi-repricing",
            pageFamily: "agi-repricing",
            utmSource: "facebook",
            utmMedium: "paid_social",
            utmCampaign: "agi-repricing-us",
            utmContent: "qa-a"
        }
    );
    assert.ok(campaign003);
    assert.strictEqual(
        campaign003.landingPath,
        "/lp/003-weight-of-the-index/"
    );
    assert.deepStrictEqual(
        buildSourceAttribution({
            landingContext: {
                campaignId: "003",
                pageId: "browser-tampered-page",
                pageFamily: "browser-tampered-family",
                utmSource: "facebook",
                utmMedium: "paid_social",
                utmCampaign: "index-weight-us",
                utmContent: "qa-a"
            }
        }),
        {
            campaignId: "003",
            campaignName: "The Weight of the Index",
            landingPath: "/lp/003-weight-of-the-index/",
            pageId: "003-weight-of-the-index",
            pageFamily: "weight-of-the-index",
            utmSource: "facebook",
            utmMedium: "paid_social",
            utmCampaign: "index-weight-us",
            utmContent: "qa-a"
        }
    );
    assert.ok(campaign);
    assert.strictEqual(
        campaign.landingPath,
        "/lp/004-when-machines-become-work/"
    );

    const attribution =
        buildSourceAttribution({
            landingContext: {
                campaignId: "004",
                pageId: "browser-tampered-page",
                pageFamily: "browser-tampered-family",
                utmSource: "facebook",
                utmMedium: "paid_social",
                utmCampaign: "robotics-us",
                utmContent: "creative-a"
            }
        });

    assert.deepStrictEqual(
        attribution,
        {
            campaignId: "004",
            campaignName:
                "When Machines Become Work",
            landingPath:
                "/lp/004-when-machines-become-work/",
            pageId:
                "004-when-machines-become-work",
            pageFamily:
                "when-machines-become-work",
            utmSource: "facebook",
            utmMedium: "paid_social",
            utmCampaign: "robotics-us",
            utmContent: "creative-a"
        }
    );

    const serialized =
        serializeAdminSession({
            userId: "visitor-004",
            landingContext: {
                campaignId: "004"
            }
        });

    assert.strictEqual(
        serialized.sourceAttribution
            .campaignName,
        campaign.title
    );
    assert.strictEqual(
        serialized.sourceAttribution
            .landingPath,
        campaign.landingPath
    );
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            serialized.sourceAttribution,
            "utmSource"
        ),
        false,
        "missing UTMs must remain absent"
    );

    assert.strictEqual(
        buildSourceAttribution({
            landingContext: {
                campaignId: "999",
                pageId:
                    "004-when-machines-become-work"
            }
        }),
        null,
        "an unregistered campaign must not produce attribution"
    );
}


function testUtmAllowlist() {
    assert.strictEqual(MAX_UTM_LENGTH, 200);

    assert.deepStrictEqual(
        normalizeApprovedUtm({
            utmSource: " facebook ",
            utmMedium: "paid_social",
            utmCampaign: "robotics-us",
            utmContent: "creative-a",
            gclid: "must-not-persist",
            redirect: "https://evil.example",
            utmTerm: "not-approved"
        }),
        {
            utmSource: "facebook",
            utmMedium: "paid_social",
            utmCampaign: "robotics-us",
            utmContent: "creative-a"
        }
    );

    assert.deepStrictEqual(
        normalizeApprovedUtm({
            utmSource: "x".repeat(201),
            utmMedium: "paid\u0000social",
            utmCampaign: ["duplicate", "values"]
        }),
        {}
    );
}


function runClientConfig(search) {
    const source = fs.readFileSync(
        path.join(
            root,
            "public/js/core/config.js"
        ),
        "utf8"
    );

    const windowObject = {
        MeridianVisitorIdentity: {
            getOrCreate() {
                return "visitor-config-test";
            },
            getConversationId() {
                return "conversation-config-test";
            }
        },
        MeridianLandingContext: {
            campaignId: "004",
            pageId:
                "004-when-machines-become-work",
            pageFamily:
                "when-machines-become-work",
            variantId: ""
        },
        location: {
            origin: "http://127.0.0.1:3000",
            href:
                "http://127.0.0.1:3000/lp/004-when-machines-become-work/"
                + search,
            search
        }
    };

    vm.runInNewContext(
        source,
        {
            window: windowObject,
            document: {
                referrer: ""
            },
            URLSearchParams,
            Math
        },
        {
            filename: "config.js"
        }
    );

    return clone(
        windowObject.MeridianConfig
            .user.landingContext
    );
}


function testClientUtmCapture() {
    const context = runClientConfig(
        "?utm_source=facebook"
        + "&utm_medium=paid_social"
        + "&utm_campaign=robotics-us"
        + "&utm_content=creative-a"
        + "&gclid=ignored"
        + "&redirect=https://evil.example"
    );

    assert.strictEqual(context.campaignId, "004");
    assert.strictEqual(context.utmSource, "facebook");
    assert.strictEqual(context.utmMedium, "paid_social");
    assert.strictEqual(context.utmCampaign, "robotics-us");
    assert.strictEqual(context.utmContent, "creative-a");
    assert.strictEqual(
        context.whatsappRouteKey,
        "",
        "registered Campaigns without an approved WhatsApp binding must remain unbound"
    );
    assert.strictEqual(context.gclid, undefined);
    assert.strictEqual(context.redirect, undefined);

    const duplicate = runClientConfig(
        "?utm_source=one&utm_source=two"
    );

    assert.strictEqual(
        duplicate.utmSource,
        undefined,
        "duplicate UTM values must be ignored"
    );
}


async function testFirstTouchPersistence() {
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
        const sessionService =
            require(servicePath);

        const canonical =
            resolveAnalysisLandingContext({
                campaignId: "002"
            });

        const firstTouch =
            attachApprovedUtm(
                canonical,
                {
                    campaignId: "002",
                    utmSource: "facebook",
                    utmMedium: "paid_social",
                    utmCampaign: "agi-repricing-us",
                    utmContent: "qa-a"
                }
            );

        existingSession = null;

        await sessionService.createSession({
            userId: "visitor-first-touch",
            conversationId: "conversation-first-touch",
            allowConversationReset: false,
            landingContext: firstTouch
        });

        assert.strictEqual(
            lastUpdate.$set.landingContext
                .campaignId,
            "002"
        );
        assert.strictEqual(
            lastUpdate.$set.landingContext
                .utmSource,
            "facebook"
        );

        existingSession = {
            userId: "visitor-first-touch",
            conversationId: "conversation-first-touch",
            landingContext: {
                ...firstTouch,
                capturedAt:
                    "2026-09-15T00:00:00.000Z"
            }
        };

        await sessionService.createSession({
            userId: "visitor-first-touch",
            conversationId: "conversation-first-touch",
            allowConversationReset: false,
            landingContext: attachApprovedUtm(
                canonical,
                {
                    utmSource: "should-not-overwrite"
                }
            )
        });

        assert.strictEqual(
            Object.prototype.hasOwnProperty.call(
                lastUpdate.$set,
                "landingContext"
            ),
            false,
            "duplicate user_online must preserve first touch"
        );

        const untrusted =
            attachApprovedUtm(
                resolveAnalysisLandingContext({
                    campaignId: "<script>004</script>"
                }),
                {
                    utmSource: "attacker"
                }
            );

        assert.strictEqual(untrusted, null);

        await sessionService.createSession({
            userId: "visitor-first-touch",
            conversationId: "conversation-first-touch",
            allowConversationReset: false,
            landingContext: untrusted
        });

        assert.strictEqual(
            Object.prototype.hasOwnProperty.call(
                lastUpdate.$set,
                "landingContext"
            ),
            false,
            "malformed Campaign IDs must not replace first touch"
        );
    }
    finally {
        if (originalModel) {
            require.cache[modelPath] =
                originalModel;
        }
        else {
            delete require.cache[modelPath];
        }

        if (originalService) {
            require.cache[servicePath] =
                originalService;
        }
        else {
            delete require.cache[servicePath];
        }
    }
}


function testSafeAdminRendering() {
    const source = fs.readFileSync(
        path.join(
            root,
            "public/js/admin/admin-leads.js"
        ),
        "utf8"
    );

    const context = {
        window: {},
        document: {
            createElement(tagName) {
                return {
                    tagName,
                    textContent: ""
                };
            }
        }
    };

    vm.runInNewContext(
        source,
        context,
        {
            filename: "admin-leads.js"
        }
    );

    const renderer =
        context.window.MeridianAdminLeads
        .renderSourceAttribution;

    assert.doesNotMatch(
        renderer.toString(),
        /innerHTML|insertAdjacentHTML/,
        "visitor-facing attribution rendering must not parse HTML"
    );
    assert.match(renderer.toString(), /textContent/);
    assert.match(renderer.toString(), /replaceChildren/);

    const ui =
        context.window.MeridianAdminLeads;

    ui.sourceBadge = {
        textContent: "",
        title: ""
    };
    ui.sourceSummary = {
        textContent: ""
    };
    ui.sourceDetails = {
        children: [],
        replaceChildren() {
            this.children = [];
        },
        append(...children) {
            this.children.push(...children);
        }
    };

    renderer.call(ui, null);
    assert.strictEqual(
        ui.sourceBadge.textContent,
        "来源：Direct / Unknown"
    );
    assert.strictEqual(
        ui.sourceDetails.children.length,
        0
    );

    const hostile =
        '<img src=x onerror="alert(1)">';

    renderer.call(ui, {
        campaignId: "004",
        campaignName: hostile,
        landingPath:
            "/lp/004-when-machines-become-work/",
        pageId:
            "004-when-machines-become-work",
        pageFamily:
            "when-machines-become-work"
    });

    assert.ok(
        ui.sourceBadge.textContent.includes(
            hostile
        ),
        "hostile-looking values must remain inert text"
    );
    assert.strictEqual(
        ui.sourceDetails.children.length,
        8,
        "missing UTM fields must not create blank detail rows"
    );

    renderer.call(ui, buildSourceAttribution({
        landingContext: {
            campaignId: "002",
            utmSource: "facebook",
            utmMedium: "paid_social",
            utmCampaign: "agi-repricing-us",
            utmContent: "qa-a"
        }
    }));

    assert.strictEqual(
        ui.sourceBadge.textContent,
        "来源：#002 · The AGI Repricing"
    );
    assert.strictEqual(
        ui.sourceSummary.textContent,
        "#002 · The AGI Repricing"
    );
    assert.strictEqual(
        ui.sourceDetails.children.length,
        16,
        "Campaign 002 and its four approved UTMs must render through the shared Admin mapping"
    );

    renderer.call(ui, buildSourceAttribution({
        landingContext: {
            campaignId: "003",
            utmSource: "facebook",
            utmMedium: "paid_social",
            utmCampaign: "index-weight-us",
            utmContent: "qa-a"
        }
    }));

    assert.ok(
        ui.sourceBadge.textContent.includes("#003")
        && ui.sourceBadge.textContent.includes("The Weight of the Index")
    );
    assert.ok(
        ui.sourceSummary.textContent.includes("#003")
        && ui.sourceSummary.textContent.includes("The Weight of the Index")
    );
    assert.strictEqual(
        ui.sourceDetails.children.length,
        16,
        "Campaign 003 and its four approved UTMs must render through the shared Admin mapping"
    );

    const presenceSource = fs.readFileSync(
        path.join(
            root,
            "server/socket/presence-handler.js"
        ),
        "utf8"
    );

    assert.match(
        presenceSource,
        /serializeAdminSession\s*\(\s*session\s*\)/,
        "admin presence updates must include the safe attribution serializer"
    );
}


async function run() {
    testTrustedSerialization();
    testUtmAllowlist();
    testClientUtmCapture();
    await testFirstTouchPersistence();
    testSafeAdminRendering();

    console.log(
        "Admin source attribution tests passed."
    );
}


run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
