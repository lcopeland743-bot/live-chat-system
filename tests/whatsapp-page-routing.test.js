/**
 * Meridian WhatsApp Page Routing Test
 *
 * Version: v2.5.0
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
    return fs.readFileSync(
        path.join(root, relativePath),
        "utf8"
    );
}

function clone(value) {
    return value
        ? JSON.parse(JSON.stringify(value))
        : null;
}

async function run() {
    process.env.AI_WHATSAPP_ENABLED = "false";
    process.env.AI_WHATSAPP_NUMBER = "";

    const utils = require(
        "../server/utils/whatsapp-settings-utils"
    );
    const landingUtils = require(
        "../server/utils/landing-context-utils"
    );

    assert.strictEqual(
        utils.normalizeRouteKey("Market-Clarity-A"),
        "market-clarity-a"
    );
    assert.strictEqual(
        utils.normalizeRouteKey("../bad"),
        ""
    );
    assert.strictEqual(
        utils.buildInternalUrl(
            "Hello market",
            "/go/whatsapp",
            "market-clarity-a"
        ),
        "/go/whatsapp/market-clarity-a?text=Hello%20market"
    );

    assert.deepStrictEqual(
        landingUtils.normalizeLandingContext({
            pageId: "Market-Clarity-A",
            campaignId: "US-Campaign-A",
            whatsappRouteKey: "Market-Clarity-A"
        }),
        {
            pageId: "market-clarity-a",
            pageFamily: "",
            variantId: "",
            campaignId: "us-campaign-a",
            whatsappRouteKey: "market-clarity-a"
        }
    );

    let storedDocument = null;

    function queryResult() {
        return {
            async lean() {
                return clone(storedDocument);
            }
        };
    }

    const fakeModel = {
        findOne() {
            return queryResult();
        },
        findOneAndUpdate(filter, update) {
            storedDocument = {
                ...(storedDocument || {}),
                ...(update.$setOnInsert || {}),
                ...(update.$set || {}),
                settingsKey: "global",
                updatedAt: new Date().toISOString()
            };

            return {
                async lean() {
                    return clone(storedDocument);
                }
            };
        }
    };

    const modelPath = require.resolve(
        "../server/database/models/whatsapp-settings-model"
    );
    require.cache[modelPath] = {
        id: modelPath,
        filename: modelPath,
        loaded: true,
        exports: fakeModel,
        children: [],
        paths: []
    };

    const servicePath = require.resolve(
        "../server/services/whatsapp-settings-service"
    );
    delete require.cache[servicePath];
    const service = require(servicePath);

    await service.saveSettings({
        number: "13182009447",
        enabled: true,
        updatedBy: "test"
    });

    let settings = await service.saveNumber({
        label: "US Number A",
        number: "12025550111",
        enabled: true,
        updatedBy: "test"
    });
    const numberA = settings.numbers.find(
        (entry) => entry.label === "US Number A"
    );

    settings = await service.saveNumber({
        label: "US Number B",
        number: "12025550222",
        enabled: true,
        updatedBy: "test"
    });
    const numberB = settings.numbers.find(
        (entry) => entry.label === "US Number B"
    );

    assert.ok(numberA && numberA.numberId);
    assert.ok(numberB && numberB.numberId);

    await service.saveRouteBinding({
        routeKey: "market-clarity-a",
        numberId: numberA.numberId,
        updatedBy: "test"
    });
    await service.saveRouteBinding({
        routeKey: "market-clarity-b",
        numberId: numberB.numberId,
        updatedBy: "test"
    });

    const routeA = await service.getResolvedSettings({
        routeKey: "market-clarity-a"
    });
    const routeB = await service.getResolvedSettings({
        routeKey: "market-clarity-b"
    });
    const routeC = await service.getResolvedSettings({
        routeKey: "market-clarity-c"
    });

    assert.strictEqual(routeA.number, "12025550111");
    assert.strictEqual(routeA.resolutionSource, "admin-route");
    assert.strictEqual(routeA.numberId, numberA.numberId);
    assert.strictEqual(routeB.number, "12025550222");
    assert.strictEqual(routeC.number, "13182009447");
    assert.strictEqual(routeC.resolutionSource, "admin-global");
    assert.strictEqual(routeC.fallbackUsed, true);

    await service.saveNumber({
        numberId: numberB.numberId,
        label: "US Number B",
        number: "12025550222",
        enabled: false,
        updatedBy: "test"
    });

    const disabledRouteFallback =
        await service.getResolvedSettings({
            routeKey: "market-clarity-b"
        });

    assert.strictEqual(
        disabledRouteFallback.number,
        "13182009447"
    );
    assert.strictEqual(
        disabledRouteFallback.resolutionSource,
        "admin-global"
    );

    await service.disableSettings({ updatedBy: "test" });

    const paused = await service.getResolvedSettings({
        routeKey: "market-clarity-a"
    });

    assert.strictEqual(paused.enabled, false);
    assert.strictEqual(paused.resolutionSource, "admin-disabled");

    const redirectSource = read(
        "server/routes/whatsapp-redirect-route.js"
    );
    assert.match(
        redirectSource,
        /\/go\/whatsapp\/:routeKey/
    );

    const sessionModelSource = read(
        "server/database/models/session-model.js"
    );
    assert.match(sessionModelSource, /landingContextSchema/);
    assert.match(sessionModelSource, /whatsappRouteKey/);

    const presenceSource = read(
        "server/socket/presence-handler.js"
    );
    assert.match(presenceSource, /landingContext/);

    const aiSource = read(
        "server/services/ai-conversation-service.js"
    );
    assert.match(
        aiSource,
        /landingContext\.whatsappRouteKey/
    );

    const chatUiSource = read("public/js/ui/chat-ui.js");
    assert.match(chatUiSource, /getCurrentWhatsappRouteKey/);
    assert.match(chatUiSource, /\/go\/whatsapp\/\$\{/);

    const adminSource = read(
        "public/js/admin/admin-whatsapp-settings.js"
    );
    assert.match(adminSource, /saveRoute/);
    assert.match(adminSource, /saveNumber/);

    ["a", "b", "c"].forEach((variant) => {
        const slug = `market-clarity-${variant}`;
        const html = read(`public/lp/${slug}/index.html`);
        assert.match(
            html,
            new RegExp(`"whatsappRouteKey": "${slug}"`)
        );
    });

    console.log(
        "[PASS] WhatsApp page routing tests passed."
    );
}

run().catch((error) => {
    console.error(
        "[FAIL] WhatsApp page routing tests failed."
    );
    console.error(error);
    process.exitCode = 1;
});
