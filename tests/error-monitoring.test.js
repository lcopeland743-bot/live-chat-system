/**
 * Meridian Error Monitoring Test
 *
 * Version:
 * v2.3.11
 */

const assert =
require("assert");


const fs =
require("fs");


const path =
require("path");


const Module =
require("module");


const documents =
new Map();


let failPersistence =
false;


function clone(value) {
    if (value === null || value === undefined) {
        return value;
    }

    return JSON.parse(
        JSON.stringify(value)
    );
}


function matches(document, query) {
    return Object.entries(query || {})
    .every(([key, expected]) => {
        return document[key] === expected;
    });
}


const FakeErrorEvent = {
    async findOneAndUpdate(
        filter,
        update,
        options = {}
    ) {
        if (failPersistence) {
            throw new Error(
                "database temporarily unavailable"
            );
        }

        let document =
            Array.from(
                documents.values()
            )
            .find(item => matches(item, filter));

        const inserted =
            !document;

        if (!document) {
            if (!options.upsert) {
                return null;
            }

            document = {};
        }

        if (
            inserted
            && update.$setOnInsert
        ) {
            Object.assign(
                document,
                clone(update.$setOnInsert)
            );
        }

        if (update.$set) {
            Object.assign(
                document,
                clone(update.$set)
            );
        }

        if (update.$inc) {
            for (
                const [key, amount]
                of Object.entries(update.$inc)
            ) {
                document[key] =
                    Number(document[key] || 0)
                    + Number(amount || 0);
            }
        }

        if (!document.createdAt) {
            document.createdAt =
                new Date().toISOString();
        }

        document.updatedAt =
            new Date().toISOString();

        documents.set(
            document.fingerprint,
            document
        );

        return clone(document);
    },


    find(query = {}) {
        let rows =
            Array.from(
                documents.values()
            )
            .filter(item => matches(item, query))
            .map(clone);

        const chain = {
            sort(specification = {}) {
                if (specification.lastSeenAt === -1) {
                    rows.sort(
                        (a, b) => {
                            return new Date(b.lastSeenAt)
                            - new Date(a.lastSeenAt);
                        }
                    );
                }

                return chain;
            },

            limit(limit) {
                rows = rows.slice(0, limit);
                return chain;
            },

            lean() {
                return Promise.resolve(
                    clone(rows)
                );
            }
        };

        return chain;
    },


    async countDocuments(query = {}) {
        return Array.from(
            documents.values()
        )
        .filter(item => matches(item, query))
        .length;
    },


    async updateMany(filter, update) {
        let matchedCount = 0;
        let modifiedCount = 0;

        for (const document of documents.values()) {
            if (!matches(document, filter)) {
                continue;
            }

            matchedCount += 1;

            if (update.$set) {
                Object.assign(
                    document,
                    clone(update.$set)
                );
                modifiedCount += 1;
            }
        }

        return {
            matchedCount,
            modifiedCount
        };
    }
};


const originalModuleLoad =
Module._load;


Module._load =
function(request, parent, isMain) {
    const fromErrorMonitorService =
        parent
        && /error-monitor-service\.js$/.test(
            parent.filename
        );

    if (
        fromErrorMonitorService
        && request ===
            "../database/models/error-event-model"
    ) {
        return FakeErrorEvent;
    }

    return originalModuleLoad(
        request,
        parent,
        isMain
    );
};


const errorMonitorService =
require(
    "../server/services/error-monitor-service"
);


Module._load =
originalModuleLoad;


function read(relativePath) {
    return fs.readFileSync(
        path.join(
            __dirname,
            "..",
            relativePath
        ),
        "utf8"
    );
}


function createRepeatedError() {
    const error =
        new Error(
            "OpenAI key sk-testSecret123456789 failed"
        );

    error.code =
        "OPENAI_TEST_FAILURE";

    return error;
}


async function run() {
    documents.clear();
    errorMonitorService.resetForTests();

    const first =
        await errorMonitorService
        .captureWarning({
            source:
                "openai.test_fallback",
            error:
                createRepeatedError(),
            context: {
                password:
                    "super-secret",
                token:
                    "token-value",
                content:
                    "private customer message",
                sessionId:
                    "session-123",
                nested: {
                    authorization:
                        "Bearer secret-token-value"
                }
            },
            recovered:
                true
        });

    assert.ok(first);
    assert.strictEqual(
        documents.size,
        1,
        "first event should be persisted"
    );

    const stored =
        Array.from(
            documents.values()
        )[0];

    assert.ok(
        !stored.message.includes(
            "sk-testSecret"
        ),
        "API keys must be redacted from messages"
    );

    assert.strictEqual(
        stored.context.password,
        "[REDACTED]"
    );

    assert.strictEqual(
        stored.context.token,
        "[REDACTED]"
    );

    assert.strictEqual(
        stored.context.content,
        "[REDACTED]"
    );

    assert.strictEqual(
        stored.context.sessionId,
        "session-123",
        "safe identifiers should remain available"
    );

    assert.strictEqual(
        stored.context.nested.authorization,
        "[REDACTED]"
    );

    await errorMonitorService
        .captureWarning({
            source:
                "openai.test_fallback",
            error:
                createRepeatedError(),
            recovered:
                true
        });

    assert.strictEqual(
        documents.size,
        1,
        "matching errors should aggregate by fingerprint"
    );

    assert.strictEqual(
        Array.from(documents.values())[0]
            .occurrenceCount,
        2
    );

    const listed =
        await errorMonitorService
        .list({
            resolved: false,
            limit: 20
        });

    assert.strictEqual(
        listed.events.length,
        1
    );

    assert.deepStrictEqual(
        listed.summary,
        {
            unresolved: 1,
            warning: 1,
            error: 0,
            critical: 0,
            buffered: 0
        }
    );

    const eventId =
        listed.events[0].eventId;

    const resolved =
        await errorMonitorService
        .resolveEvent(eventId);

    assert.strictEqual(
        resolved.resolved,
        true
    );

    const resolvedList =
        await errorMonitorService
        .list({
            resolved: false
        });

    assert.strictEqual(
        resolvedList.summary.unresolved,
        0
    );

    await errorMonitorService
        .captureWarning({
            source:
                "openai.test_fallback",
            error:
                createRepeatedError(),
            recovered:
                true
        });

    const reopened =
        Array.from(
            documents.values()
        )[0];

    assert.strictEqual(
        reopened.resolved,
        false,
        "a recurring error must reopen a resolved fingerprint"
    );

    assert.strictEqual(
        reopened.occurrenceCount,
        3
    );

    failPersistence =
        true;

    const buffered =
        await errorMonitorService
        .captureError({
            source:
                "socket.test",
            error:
                new Error(
                    "temporary persistence failure"
                )
        });

    assert.strictEqual(
        buffered.buffered,
        true
    );

    assert.strictEqual(
        errorMonitorService
        .getStatus()
        .buffered,
        1
    );

    failPersistence =
        false;

    const flushResult =
        await errorMonitorService
        .flushBuffer();

    assert.strictEqual(
        flushResult.persisted,
        1
    );

    assert.strictEqual(
        flushResult.remaining,
        0
    );

    const serverSource =
        read("server.js");

    const htmlSource =
        read("server/views/admin.html");

    const adminSource =
        read("public/js/admin/admin.js");

    const packageJson =
        JSON.parse(
            read("package.json")
        );

    assert.match(
        serverSource,
        /\/api\/admin\/errors/
    );

    assert.match(
        serverSource,
        /expressErrorHandler/
    );

    assert.match(
        serverSource,
        /installProcessHandlers/
    );

    assert.match(
        htmlSource,
        /id="adminErrorPanel"/
    );

    assert.match(
        htmlSource,
        /admin-errors\.js/
    );

    assert.match(
        adminSource,
        /MeridianAdminErrors\.init/
    );


    assert.strictEqual(
        packageJson.scripts[
            "test:error-monitor"
        ],
        "node tests/error-monitoring.test.js"
    );

    console.log(
        "Error Monitoring v2.3.11 tests passed."
    );
}


run()
.catch(error => {
    console.error(error);
    process.exitCode = 1;
});
