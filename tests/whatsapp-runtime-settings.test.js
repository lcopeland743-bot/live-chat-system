/**
 * Meridian WhatsApp Runtime Settings Static/Unit Test
 *
 * Version: v2.4.2
 */

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

async function run() {
    const utils = require(
        "../server/utils/whatsapp-settings-utils"
    );

    assert.strictEqual(
        utils.normalizePhoneNumber(
            "+1 (415) 555-2671"
        ),
        "14155552671"
    );

    assert.strictEqual(
        utils.normalizePhoneNumber("123"),
        ""
    );

    assert.strictEqual(
        utils.normalizePhoneNumber(
            "1234567890123456"
        ),
        ""
    );

    assert.strictEqual(
        utils.buildInternalUrl(""),
        "/go/whatsapp"
    );

    assert.strictEqual(
        utils.buildInternalUrl("Hello market"),
        "/go/whatsapp?text=Hello%20market"
    );

    assert.strictEqual(
        utils.buildExternalUrl(
            "14155552671",
            "Hello"
        ),
        "https://wa.me/14155552671?text=Hello"
    );

    const disabledStored =
        utils.storedSettings({
            enabled: false,
            activeNumber: "14155552671",
            previousNumber: "",
            updatedBy: "admin"
        });

    assert.strictEqual(disabledStored.enabled, false);
    assert.strictEqual(
        disabledStored.number,
        "14155552671"
    );

    const emptyStored =
        utils.storedSettings({
            enabled: true,
            activeNumber: "",
            previousNumber: ""
        });

    assert.strictEqual(emptyStored.enabled, false);
    assert.strictEqual(emptyStored.hasNumber, false);

    process.env.AI_WHATSAPP_ENABLED = "false";
    process.env.AI_WHATSAPP_NUMBER = "";

    let storedDocument = null;

    function clone(value) {
        return value
            ? JSON.parse(JSON.stringify(value))
            : null;
    }

    function createDocument() {
        if (!storedDocument) {
            return null;
        }

        return {
            ...storedDocument,
            async save() {
                storedDocument = {
                    settingsKey: this.settingsKey,
                    enabled: this.enabled,
                    activeNumber: this.activeNumber,
                    previousNumber: this.previousNumber,
                    updatedBy: this.updatedBy,
                    updatedAt: new Date().toISOString()
                };
                Object.assign(this, storedDocument);
                return this;
            },
            toObject() {
                return clone(storedDocument);
            }
        };
    }

    function queryResult() {
        const document = createDocument();

        return {
            async lean() {
                return clone(storedDocument);
            },
            then(resolve, reject) {
                return Promise.resolve(document)
                    .then(resolve, reject);
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

    const settingsService = require(servicePath);

    const initialSettings =
        await settingsService.getResolvedSettings();

    assert.strictEqual(initialSettings.enabled, false);
    assert.strictEqual(initialSettings.number, "");

    const firstSettings =
        await settingsService.saveSettings({
            number: "14155552671",
            enabled: true,
            updatedBy: "admin"
        });

    assert.strictEqual(firstSettings.enabled, true);
    assert.strictEqual(
        firstSettings.number,
        "14155552671"
    );

    const secondSettings =
        await settingsService.saveSettings({
            number: "442071838750",
            enabled: true,
            updatedBy: "admin"
        });

    assert.strictEqual(
        secondSettings.previousNumber,
        "14155552671"
    );

    const restoredSettings =
        await settingsService.restorePrevious({
            updatedBy: "admin"
        });

    assert.strictEqual(
        restoredSettings.number,
        "14155552671"
    );
    assert.strictEqual(
        restoredSettings.previousNumber,
        "442071838750"
    );

    const pausedSettings =
        await settingsService.disableSettings({
            updatedBy: "admin"
        });

    assert.strictEqual(pausedSettings.enabled, false);
    assert.strictEqual(
        pausedSettings.number,
        "14155552671"
    );

    const directNumberPattern =
        /(?:12085035427|19342032173)/;

    const sourceFiles = [
        "server/config/conversion-config.js",
        "server/services/briefing-auto-reply-service.js",
        "server/services/whatsapp-conversion-service.js",
        "public/js/admin/admin-link-card.js"
    ];

    for (const file of sourceFiles) {
        assert.ok(
            !directNumberPattern.test(read(file)),
            `${file} still contains a legacy hardcoded number`
        );
    }

    const briefingSource = read(
        "server/services/briefing-auto-reply-service.js"
    );

    assert.ok(
        briefingSource.includes(
            "async function createAutoReplyMessages"
        )
    );
    assert.ok(
        briefingSource.includes(
            "!whatsappSettings.enabled"
        )
    );
    assert.ok(
        briefingSource.includes(
            ".buildInternalUrl("
        )
    );

    const conversionSource = read(
        "server/services/whatsapp-conversion-service.js"
    );

    assert.ok(
        conversionSource.includes(
            "!resolvedSettings.enabled"
        )
    );
    assert.ok(
        conversionSource.includes(
            ".buildInternalUrl("
        )
    );

    const policySource = read(
        "server/services/conversion-policy-service.js"
    );

    assert.ok(
        policySource.includes(
            "whatsappAvailable"
        )
    );

    assert.ok(
        read("server.js").includes(
            "/api/admin/whatsapp-settings"
        )
    );

    assert.ok(
        read("server/routes/whatsapp-redirect-route.js")
            .includes("/go/whatsapp")
    );

    assert.ok(
        read("public/js/ui/chat-ui.js")
            .includes("getWhatsappUrl")
    );

    assert.ok(
        read("server/views/admin.html")
            .includes("adminWhatsappNumber")
    );

    assert.ok(
        read(".env.example").includes(
            "AI_WHATSAPP_NUMBER=\n"
        )
    );

    console.log(
        "[PASS] WhatsApp runtime settings tests passed."
    );
}

run().catch((error) => {
    console.error(
        "[FAIL] WhatsApp runtime settings tests failed."
    );
    console.error(error);
    process.exitCode = 1;
});
