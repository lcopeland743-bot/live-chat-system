/**
 * Meridian Admin Presence Indicator Regression Tests
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

const {
    serializeAdminSession
} = require(
    "../server/services/source-attribution-service"
);


function loadLeadRenderer() {
    const source = fs.readFileSync(
        path.join(
            root,
            "public/js/admin/admin-leads.js"
        ),
        "utf8"
    );

    const context = {
        window: {},
        document: {}
    };

    vm.runInNewContext(
        source,
        context,
        {
            filename: "admin-leads.js"
        }
    );

    return context.window.MeridianAdminLeads;
}


function testSerializerPreservesPresence() {
    for (const status of ["online", "offline"]) {
        const serialized =
            serializeAdminSession({
                userId: "visitor-presence-test",
                status,
                landingContext: {
                    campaignId: "004"
                }
            });

        assert.strictEqual(
            serialized.status,
            status,
            "source attribution serialization must preserve presence status"
        );
        assert.strictEqual(
            serialized.sourceAttribution.campaignId,
            "004",
            "presence and source attribution must coexist in the admin payload"
        );
    }
}


function testDetailPresenceRenderer() {
    const adminLeads = loadLeadRenderer();
    const attributes = {};

    adminLeads.presenceBadge = {
        className: "",
        textContent: "",
        setAttribute(name, value) {
            attributes[name] = value;
        }
    };

    adminLeads.renderPresenceStatus("online");
    assert.strictEqual(
        adminLeads.presenceBadge.textContent,
        "ONLINE"
    );
    assert.match(
        adminLeads.presenceBadge.className,
        /status-online/
    );
    assert.strictEqual(
        attributes["aria-label"],
        "访客当前在线"
    );

    adminLeads.renderPresenceStatus("offline");
    assert.strictEqual(
        adminLeads.presenceBadge.textContent,
        "OFFLINE"
    );
    assert.match(
        adminLeads.presenceBadge.className,
        /status-offline/
    );
    assert.strictEqual(
        attributes["aria-label"],
        "访客当前离线"
    );
}


function testListAndDetailWiring() {
    const uiSource = fs.readFileSync(
        path.join(
            root,
            "public/js/admin/admin-ui.js"
        ),
        "utf8"
    );
    const leadSource = fs.readFileSync(
        path.join(
            root,
            "public/js/admin/admin-leads.js"
        ),
        "utf8"
    );
    const html = fs.readFileSync(
        path.join(
            root,
            "server/views/admin.html"
        ),
        "utf8"
    );

    assert.match(
        uiSource,
        /session-presence-label status-\$\{statusLabel\.toLowerCase\(\)\}/,
        "visitor cards must render an explicit presence label"
    );
    assert.match(
        uiSource,
        /className === "online-user"/,
        "online/offline presence lists must render their existing state explicitly"
    );
    assert.match(
        leadSource,
        /renderPresenceStatus\(\s*session\.status\s*\)/,
        "customer detail must render the current session presence field"
    );
    assert.match(
        html,
        /id="adminLeadPresenceBadge"/,
        "customer detail must expose a dedicated presence node"
    );
    assert.match(
        html,
        /id="adminLeadSourceBadge"/,
        "source attribution must remain visible beside presence"
    );
}


testSerializerPreservesPresence();
testDetailPresenceRenderer();
testListAndDetailWiring();

console.log(
    "Admin presence indicator regression tests passed."
);
