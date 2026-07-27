const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const {
    normalizeIp,
    getSocketClientIp,
    getSocketUserAgent
} = require(
    "../server/utils/client-ip"
);

const presenceService = require(
    "../server/services/presence-service"
);


function createBrowserEnvironment(
    sharedStorage = new Map(),
    sharedCookies = new Map(),
    options = {}
) {
    const localStorage = {
        getItem(key) {
            if (options.localStorageThrows) {
                throw new Error("localStorage unavailable");
            }

            return sharedStorage.has(key)
                ? sharedStorage.get(key)
                : null;
        },
        setItem(key, value) {
            if (options.localStorageThrows) {
                throw new Error("localStorage unavailable");
            }

            sharedStorage.set(
                key,
                String(value)
            );
        }
    };

    const document = {};

    Object.defineProperty(
        document,
        "cookie",
        {
            get() {
                return Array.from(
                    sharedCookies.entries()
                )
                .map(
                    ([key, value]) =>
                        `${key}=${value}`
                )
                .join("; ");
            },
            set(value) {
                const pair =
                    String(value || "")
                    .split(";")[0];

                const separator =
                    pair.indexOf("=");

                if (separator < 1) {
                    return;
                }

                sharedCookies.set(
                    pair.slice(0, separator),
                    pair.slice(separator + 1)
                );
            }
        }
    );

    let randomCounter = 0;

    const crypto = {
        randomUUID() {
            randomCounter += 1;
            return (
                "12345678-1234-4234-8234-"
                + String(randomCounter)
                    .padStart(12, "0")
            );
        },
        getRandomValues(values) {
            values.forEach(
                (_, index) => {
                    values[index] =
                        index + 100;
                }
            );
            return values;
        }
    };

    const window = {
        localStorage,
        location: {
            protocol: "https:"
        },
        crypto
    };

    window.window = window;

    return {
        window,
        document,
        console,
        Uint32Array,
        encodeURIComponent,
        decodeURIComponent,
        Date,
        Math,
        Set,
        Map,
        String,
        Array,
        Object,
        RegExp
    };
}


function loadVisitorIdentity(context) {
    const source = fs.readFileSync(
        path.join(
            __dirname,
            "../public/js/core/visitor-identity.js"
        ),
        "utf8"
    );

    vm.runInNewContext(
        source,
        context,
        {
            filename:
                "visitor-identity.js"
        }
    );

    return context.window
        .MeridianVisitorIdentity;
}


function testPersistentVisitorIdentity() {
    const storage = new Map();
    const cookies = new Map();

    const firstContext =
        createBrowserEnvironment(
            storage,
            cookies
        );

    const firstIdentity =
        loadVisitorIdentity(
            firstContext
        );

    const firstId =
        firstIdentity.getOrCreate();

    assert.match(
        firstId,
        /^user_[a-z0-9_-]{8,80}$/i
    );

    assert.strictEqual(
        storage.get("meridian_visitor_id"),
        firstId
    );

    const secondContext =
        createBrowserEnvironment(
            storage,
            cookies
        );

    const secondIdentity =
        loadVisitorIdentity(
            secondContext
        );

    assert.strictEqual(
        secondIdentity.getOrCreate(),
        firstId,
        "same browser storage must keep one visitor ID"
    );
}


function testCookieFallback() {
    const storage = new Map();
    const cookies = new Map();

    const firstContext =
        createBrowserEnvironment(
            storage,
            cookies,
            {
                localStorageThrows: true
            }
        );

    const firstId =
        loadVisitorIdentity(
            firstContext
        )
        .getOrCreate();

    const secondContext =
        createBrowserEnvironment(
            storage,
            cookies,
            {
                localStorageThrows: true
            }
        );

    const secondId =
        loadVisitorIdentity(
            secondContext
        )
        .getOrCreate();

    assert.strictEqual(
        secondId,
        firstId,
        "cookie fallback must keep one visitor ID"
    );
}


function testClientIpExtraction() {
    assert.strictEqual(
        normalizeIp(
            "203.0.113.8, 10.0.0.1"
        ),
        "203.0.113.8"
    );

    assert.strictEqual(
        normalizeIp(
            "::ffff:192.0.2.20"
        ),
        "192.0.2.20"
    );

    assert.strictEqual(
        normalizeIp("::1"),
        "127.0.0.1"
    );

    const socket = {
        handshake: {
            headers: {
                "x-forwarded-for":
                    "198.51.100.7, 10.0.0.2",
                "user-agent":
                    "Meridian Test Browser"
            },
            address:
                "::ffff:127.0.0.1"
        }
    };

    assert.strictEqual(
        getSocketClientIp(socket),
        "198.51.100.7"
    );

    assert.strictEqual(
        getSocketUserAgent(socket),
        "Meridian Test Browser"
    );
}


function testMultiTabPresence() {
    presenceService.clear();

    const first =
        presenceService.addUser({
            userId: "user_multitab01",
            socketId: "socket_a",
            ipAddress: "203.0.113.50"
        });

    assert.strictEqual(
        first.socketCount,
        1
    );

    const second =
        presenceService.addUser({
            userId: "user_multitab01",
            socketId: "socket_b",
            ipAddress: "203.0.113.50"
        });

    assert.strictEqual(
        presenceService.count(),
        1,
        "two tabs must remain one logical visitor"
    );

    assert.strictEqual(
        second.socketCount,
        2
    );

    const firstDisconnect =
        presenceService
        .removeUserBySocket(
            "socket_b"
        );

    assert.strictEqual(
        firstDisconnect.isOffline,
        false,
        "closing one tab must not mark the visitor offline"
    );

    assert.strictEqual(
        firstDisconnect.activeSocketId,
        "socket_a"
    );

    const lastDisconnect =
        presenceService
        .removeUserBySocket(
            "socket_a"
        );

    assert.strictEqual(
        lastDisconnect.isOffline,
        true,
        "closing the final tab must mark the visitor offline"
    );

    assert.strictEqual(
        presenceService.count(),
        0
    );
}


function testSourceIntegration() {
    const read = relativePath =>
        fs.readFileSync(
            path.join(
                __dirname,
                "..",
                relativePath
            ),
            "utf8"
        );

    const embedSource =
        read("public/js/embed.js");
    const configSource =
        read("public/js/core/config.js");
    const sessionModelSource =
        read("server/database/models/session-model.js");
    const sessionServiceSource =
        read("server/services/session-service.js");
    const presenceHandlerSource =
        read("server/socket/presence-handler.js");
    const adminQuerySource =
        read("server/services/admin-session-query-service.js");
    const adminHtmlSource =
        read("server/views/admin.html");
    const adminUiSource =
        read("public/js/admin/admin-ui.js");

    assert.ok(
        embedSource.indexOf(
            "/js/core/visitor-identity.js"
        )
        < embedSource.indexOf(
            "/js/core/config.js"
        ),
        "visitor identity must load before config"
    );

    assert.match(
        configSource,
        /MeridianVisitorIdentity/
    );

    assert.match(
        sessionModelSource,
        /ipAddress/
    );

    assert.match(
        sessionModelSource,
        /userAgent/
    );

    assert.match(
        sessionServiceSource,
        /setActiveSocket/
    );

    assert.match(
        presenceHandlerSource,
        /getSocketClientIp/
    );

    assert.match(
        adminQuerySource,
        /ipAddress:\s*searchRegex/
    );

    assert.match(
        adminHtmlSource,
        /id="adminLeadIpAddress"/
    );

    assert.match(
        adminUiSource,
        /getSameIpCount/
    );
}


function run() {
    testPersistentVisitorIdentity();
    testCookieFallback();
    testClientIpExtraction();
    testMultiTabPresence();
    testSourceIntegration();

    console.log(
        "Visitor Identity + IP v2.4.2 tests passed."
    );
}


run();
