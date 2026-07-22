const assert =
require("assert");


const fs =
require("fs");


const path =
require("path");


const scheduler =
require(
    "../server/services/ai-auto-reply-scheduler"
);


function deferred() {
    let resolve;
    let reject;

    const promise =
        new Promise(
            (resolvePromise, rejectPromise) => {
                resolve =
                    resolvePromise;
                reject =
                    rejectPromise;
            }
        );

    return {
        promise,
        resolve,
        reject
    };
}


async function nextTurn() {
    await new Promise(
        resolve =>
            setImmediate(resolve)
    );
}


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


async function testLatestPendingOnly() {
    scheduler.resetForTests();

    const firstGate =
        deferred();

    const executed =
        [];

    let activeForUser =
        0;

    let maxActiveForUser =
        0;

    const first =
        scheduler.schedule({
            userId:
                "same-user",
            messageId:
                "message-1",
            task:
                async () => {
                    executed.push(
                        "message-1"
                    );

                    activeForUser +=
                        1;

                    maxActiveForUser =
                        Math.max(
                            maxActiveForUser,
                            activeForUser
                        );

                    await firstGate.promise;

                    activeForUser -=
                        1;

                    return {
                        action:
                            "reply",
                        messageId:
                            "message-1"
                    };
                }
        });

    await nextTurn();

    const second =
        scheduler.schedule({
            userId:
                "same-user",
            messageId:
                "message-2",
            task:
                async () => {
                    executed.push(
                        "message-2"
                    );

                    return {
                        action:
                            "reply"
                    };
                }
        });

    const third =
        scheduler.schedule({
            userId:
                "same-user",
            messageId:
                "message-3",
            task:
                async () => {
                    executed.push(
                        "message-3"
                    );

                    activeForUser +=
                        1;

                    maxActiveForUser =
                        Math.max(
                            maxActiveForUser,
                            activeForUser
                        );

                    activeForUser -=
                        1;

                    return {
                        action:
                            "reply",
                        messageId:
                            "message-3"
                    };
                }
        });

    const secondResult =
        await second;

    assert.strictEqual(
        secondResult.action,
        "none"
    );

    assert.strictEqual(
        secondResult.reason,
        "superseded_by_latest_message"
    );

    assert.deepStrictEqual(
        executed,
        [
            "message-1"
        ]
    );

    firstGate.resolve();

    const firstResult =
        await first;

    const thirdResult =
        await third;

    assert.strictEqual(
        firstResult.messageId,
        "message-1"
    );

    assert.strictEqual(
        thirdResult.messageId,
        "message-3"
    );

    assert.deepStrictEqual(
        executed,
        [
            "message-1",
            "message-3"
        ]
    );

    assert.strictEqual(
        maxActiveForUser,
        1
    );
}


async function testDifferentUsersRunInParallel() {
    scheduler.resetForTests();

    const gate =
        deferred();

    let active =
        0;

    let maxActive =
        0;

    function createTask(messageId) {
        return async () => {
            active +=
                1;

            maxActive =
                Math.max(
                    maxActive,
                    active
                );

            await gate.promise;

            active -=
                1;

            return {
                action:
                    "reply",
                messageId
            };
        };
    }

    const first =
        scheduler.schedule({
            userId:
                "parallel-a",
            messageId:
                "parallel-a-1",
            task:
                createTask(
                    "parallel-a-1"
                )
        });

    const second =
        scheduler.schedule({
            userId:
                "parallel-b",
            messageId:
                "parallel-b-1",
            task:
                createTask(
                    "parallel-b-1"
                )
        });

    await nextTurn();

    assert.strictEqual(
        maxActive,
        2
    );

    gate.resolve();

    await Promise.all([
        first,
        second
    ]);
}


async function testCancellationPreventsStaleResult() {
    scheduler.resetForTests();

    const gate =
        deferred();

    let cancellation =
        null;

    const running =
        scheduler.schedule({
            userId:
                "cancel-user",
            messageId:
                "cancel-message",
            onCancel:
                details => {
                    cancellation =
                        details;
                },
            task:
                async () => {
                    await gate.promise;

                    return {
                        action:
                            "reply",
                        stale:
                            true
                    };
                }
        });

    await nextTurn();

    const cancelled =
        scheduler.cancel(
            "cancel-user",
            "human_takeover"
        );

    assert.strictEqual(
        cancelled.cancelled,
        true
    );

    assert.strictEqual(
        cancelled.running,
        true
    );

    assert.strictEqual(
        cancellation.reason,
        "human_takeover"
    );

    gate.resolve();

    const result =
        await running;

    assert.strictEqual(
        result.action,
        "none"
    );

    assert.strictEqual(
        result.reason,
        "human_takeover"
    );

    assert.strictEqual(
        result.cancelled,
        true
    );
}


async function testStopPendingAfterReplyLimit() {
    scheduler.resetForTests();

    const gate =
        deferred();

    const current =
        scheduler.schedule({
            userId:
                "limit-user",
            messageId:
                "limit-message-1",
            task:
                async context => {
                    await gate.promise;

                    context.stopPending(
                        "ai_reply_limit_reached"
                    );

                    return {
                        action:
                            "reply"
                    };
                }
        });

    await nextTurn();

    const pending =
        scheduler.schedule({
            userId:
                "limit-user",
            messageId:
                "limit-message-2",
            task:
                async () => ({
                    action:
                        "reply",
                    shouldNotRun:
                        true
                })
        });

    gate.resolve();

    await current;

    const pendingResult =
        await pending;

    assert.strictEqual(
        pendingResult.action,
        "none"
    );

    assert.strictEqual(
        pendingResult.reason,
        "ai_reply_limit_reached"
    );
}


function testIntegrationWiring() {
    const conversationService =
        read(
            "server/services/ai-conversation-service.js"
        );

    const chatHandler =
        read(
            "server/socket/chat-handler.js"
        );

    const adminRoute =
        read(
            "server/routes/admin-ai-route.js"
        );

    const server =
        read(
            "server.js"
        );

    const packageJson =
        JSON.parse(
            read(
                "package.json"
            )
        );

    assert.match(
        conversationService,
        /require\("\.\/ai-auto-reply-scheduler"\)/
    );

    assert.match(
        conversationService,
        /superseded_by_latest_message|schedule\(\{/
    );

    assert.match(
        conversationService,
        /latestState\.aiReplyCount[\s\S]*initialState\.aiReplyCount/
    );

    assert.match(
        conversationService,
        /latestSession\.aiUpdatedAt[\s\S]*session\.aiUpdatedAt/
    );

    assert.match(
        conversationService,
        /cancelAutoReplies/
    );

    assert.match(
        chatHandler,
        /onAutoReplyCancelled/
    );

    assert.match(
        chatHandler,
        /cancelAutoReplies\([\s\S]*human_takeover/
    );

    assert.match(
        adminRoute,
        /cancelAutoReplies\([\s\S]*ai_mode_changed/
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

    assert.strictEqual(
        packageJson.scripts[
            "test:ai-concurrency"
        ],
        "node tests/ai-concurrency-control.test.js"
    );
}


async function run() {
    await testLatestPendingOnly();
    await testDifferentUsersRunInParallel();
    await testCancellationPreventsStaleResult();
    await testStopPendingAfterReplyLimit();
    testIntegrationWiring();

    scheduler.resetForTests();

    console.log(
        "AI Concurrency Control v2.3.11 tests passed."
    );
}


run()
.catch(
    error => {
        console.error(error);
        process.exitCode =
            1;
    }
);
