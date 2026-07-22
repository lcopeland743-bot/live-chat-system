/**
 * Meridian Silent Session Cleanup Test
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


let capturedDeleteFilter =
null;


let capturedCountFilter =
null;


const fakeSessionModel = {
    async deleteMany(filter) {
        capturedDeleteFilter =
            filter;

        return {
            deletedCount: 3
        };
    },

    async countDocuments(filter) {
        capturedCountFilter =
            filter;

        return 4;
    }
};


const fakeRetentionConfig = {
    enabled: true,
    silentSessionRetentionHours: 24,

    calculateSilentSessionCutoff(
        now
    ) {
        return new Date(
            new Date(now).getTime()
            - 24 * 60 * 60 * 1000
        );
    }
};


const originalModuleLoad =
Module._load;


Module._load =
function(request, parent, isMain) {
    const fromCleanupService =
        parent
        && /silent-session-cleanup-service\.js$/
        .test(parent.filename);

    if (fromCleanupService) {
        if (
            request ===
            "../database/models/session-model"
        ) {
            return fakeSessionModel;
        }

        if (
            request ===
            "../config/data-retention-config"
        ) {
            return fakeRetentionConfig;
        }
    }

    return originalModuleLoad(
        request,
        parent,
        isMain
    );
};


const cleanupService =
require(
    "../server/services/silent-session-cleanup-service"
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


function testEligibilityRules() {
    const cutoff =
        new Date(
            "2026-07-22T12:00:00.000Z"
        );

    const base = {
        status: "offline",
        conversationStatus:
            "unassigned",
        messageCount: 0,
        lastMessageAt: null,
        lastMessage: "",
        connectedAt:
            "2026-07-20T10:00:00.000Z",
        lastSeen:
            "2026-07-20T11:00:00.000Z",
        updatedAt:
            "2026-07-20T11:00:00.000Z"
    };

    assert.strictEqual(
        cleanupService
        .isSilentSessionEligible(
            base,
            cutoff
        ),
        true
    );

    assert.strictEqual(
        cleanupService
        .isSilentSessionEligible(
            {
                ...base,
                status: "online"
            },
            cutoff
        ),
        false,
        "online visitors must never be deleted"
    );

    assert.strictEqual(
        cleanupService
        .isSilentSessionEligible(
            {
                ...base,
                messageCount: 1
            },
            cutoff
        ),
        false,
        "any persisted message must protect the session"
    );

    assert.strictEqual(
        cleanupService
        .isSilentSessionEligible(
            {
                ...base,
                lastMessageAt:
                    "2026-07-20T11:30:00.000Z"
            },
            cutoff
        ),
        false
    );

    assert.strictEqual(
        cleanupService
        .isSilentSessionEligible(
            {
                ...base,
                lastMessage:
                    "Admin contacted visitor"
            },
            cutoff
        ),
        false
    );

    assert.strictEqual(
        cleanupService
        .isSilentSessionEligible(
            {
                ...base,
                conversationStatus:
                    "closed"
            },
            cutoff
        ),
        false,
        "closed sessions must remain under purgeAt retention"
    );

    assert.strictEqual(
        cleanupService
        .isSilentSessionEligible(
            {
                ...base,
                lastSeen:
                    "2026-07-20T11:00:00.000Z",
                updatedAt:
                    "2026-07-22T12:30:00.000Z"
            },
            cutoff
        ),
        false,
        "a recent reconnect or admin update must protect the session"
    );
}


function testMongoFilter() {
    const cutoff =
        new Date(
            "2026-07-22T12:00:00.000Z"
        );

    const filter =
        cleanupService
        .buildSilentSessionFilter(
            cutoff
        );

    assert.strictEqual(
        filter.status,
        "offline"
    );

    assert.strictEqual(
        filter.conversationStatus,
        "unassigned"
    );

    assert.ok(
        Array.isArray(filter.$and)
        && filter.$and.length === 4
    );

    assert.ok(
        filter.$and.some(
            clause => clause.$or
            && clause.$or.some(
                condition =>
                    condition.messageCount
                    && condition.messageCount.$lte === 0
            )
        ),
        "filter must require zero messages"
    );

    assert.ok(
        filter.$and.some(
            clause => clause.$expr
            && clause.$expr.$lte
        ),
        "filter must enforce the activity cutoff inside MongoDB"
    );
}


async function testModelOperations() {
    const now =
        new Date(
            "2026-07-23T12:00:00.000Z"
        );

    const result =
        await cleanupService
        .cleanupExpired(now);

    assert.strictEqual(
        result.deleted,
        3
    );

    assert.strictEqual(
        result.cutoff,
        "2026-07-22T12:00:00.000Z"
    );

    assert.strictEqual(
        capturedDeleteFilter.status,
        "offline"
    );

    const count =
        await cleanupService
        .countReadyForDeletion(now);

    assert.strictEqual(count, 4);
    assert.deepStrictEqual(
        capturedCountFilter,
        capturedDeleteFilter,
        "status preview and deletion must use the same strict filter"
    );
}


function testIntegrationWiring() {
    const packageJson =
        JSON.parse(
            read("package.json")
        );

    const server =
        read("server.js");

    const retentionService =
        read(
            "server/services/data-retention-service.js"
        );

    const retentionStatus =
        read(
            "server/scripts/data-retention-status.js"
        );

    const sessionModel =
        read(
            "server/database/models/session-model.js"
        );

    const envExample =
        read(".env.example");

    assert.match(
        retentionService,
        /silentSessionCleanupService[\s\S]*cleanupExpired/
    );

    assert.match(
        retentionService,
        /silentSessions:[\s\S]*silentSessionResult\.deleted/
    );

    assert.match(
        retentionStatus,
        /countReadyForDeletion/
    );

    assert.match(
        sessionModel,
        /silent_session_cleanup_lookup/
    );

    assert.match(
        envExample,
        /SILENT_SESSION_RETENTION_HOURS=24/
    );

    assert.strictEqual(
        packageJson.scripts[
            "test:silent-cleanup"
        ],
        "node tests/silent-session-cleanup.test.js"
    );

    const escapedVersion =
        packageJson.version.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

    assert.match(
        server,
        new RegExp(
            `Meridian Chat SDK v${escapedVersion} running on port`
        )
    );
}


async function run() {
    testEligibilityRules();
    testMongoFilter();
    await testModelOperations();
    testIntegrationWiring();

    console.log(
        "Silent Session Cleanup v2.3.11 tests passed."
    );
}


run()
.catch(error => {
    console.error(error);
    process.exitCode = 1;
});
