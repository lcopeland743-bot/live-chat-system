const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const conversationCycleService = require(
    "../server/services/conversation-cycle-service"
);

const conversionPolicyService = require(
    "../server/services/conversion-policy-service"
);

const conversionStateService = require(
    "../server/services/conversion-state-service"
);


function createStorage(shared = new Map()) {
    return {
        getItem(key) {
            return shared.has(key)
                ? shared.get(key)
                : null;
        },
        setItem(key, value) {
            shared.set(key, String(value));
        }
    };
}


function createIdentityContext({
    localStorage = new Map(),
    sessionStorage = new Map(),
    cookies = new Map()
} = {}) {
    let counter = 0;

    const document = {};

    Object.defineProperty(
        document,
        "cookie",
        {
            get() {
                return Array.from(cookies.entries())
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

                if (separator > 0) {
                    cookies.set(
                        pair.slice(0, separator),
                        pair.slice(separator + 1)
                    );
                }
            }
        }
    );

    const window = {
        localStorage:
            createStorage(localStorage),
        sessionStorage:
            createStorage(sessionStorage),
        location: {
            protocol: "https:"
        },
        crypto: {
            randomUUID() {
                counter += 1;

                return (
                    "12345678-1234-4234-8234-"
                    + String(counter)
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
        }
    };

    window.window = window;

    return {
        context: {
            window,
            document,
            console,
            Uint32Array,
            encodeURIComponent,
            decodeURIComponent,
            Date,
            Math,
            String,
            Array,
            Object,
            RegExp,
            Map,
            Set
        },
        localStorage,
        sessionStorage,
        cookies
    };
}


function loadIdentity(context) {
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


function testIdentityAndConversationCycleSeparation() {
    const localStorage = new Map();
    const firstTabSession = new Map();
    const secondTabSession = new Map();
    const cookies = new Map();

    const firstTab =
        createIdentityContext({
            localStorage,
            sessionStorage:
                firstTabSession,
            cookies
        });

    const firstIdentity =
        loadIdentity(firstTab.context);

    const visitorId =
        firstIdentity.getOrCreate();

    const conversationId =
        firstIdentity.getConversationId();

    const refreshedTab =
        createIdentityContext({
            localStorage,
            sessionStorage:
                firstTabSession,
            cookies
        });

    const refreshedIdentity =
        loadIdentity(refreshedTab.context);

    assert.strictEqual(
        refreshedIdentity.getOrCreate(),
        visitorId,
        "normal refresh must keep the visitor ID"
    );

    assert.strictEqual(
        refreshedIdentity.getConversationId(),
        conversationId,
        "normal refresh must keep the conversation cycle"
    );

    const secondTab =
        createIdentityContext({
            localStorage,
            sessionStorage:
                secondTabSession,
            cookies
        });

    const secondIdentity =
        loadIdentity(secondTab.context);

    assert.strictEqual(
        secondIdentity.getOrCreate(),
        visitorId,
        "a new tab must still represent the same visitor"
    );

    assert.notStrictEqual(
        secondIdentity.getConversationId(),
        conversationId,
        "a new tab lifecycle may start a new conversation cycle"
    );
}


function testCycleDecisionRules() {
    const first =
        conversationCycleService.evaluate({
            existingSession: null,
            incomingConversationId:
                "conversation_first0001",
            allowReset: true
        });

    assert.strictEqual(
        first.resetConversionState,
        false
    );

    assert.strictEqual(
        first.effectiveConversationId,
        "conversation_first0001"
    );

    const same =
        conversationCycleService.evaluate({
            existingSession: {
                conversationId:
                    "conversation_first0001"
            },
            incomingConversationId:
                "conversation_first0001",
            allowReset: true
        });

    assert.strictEqual(
        same.resetConversionState,
        false,
        "Socket reconnect in the same tab must not reset AI state"
    );

    const activeSecondTab =
        conversationCycleService.evaluate({
            existingSession: {
                conversationId:
                    "conversation_first0001"
            },
            incomingConversationId:
                "conversation_second002",
            allowReset: false
        });

    assert.strictEqual(
        activeSecondTab.resetConversionState,
        false,
        "a second active tab must not reset the live conversation"
    );

    assert.strictEqual(
        activeSecondTab.effectiveConversationId,
        "conversation_first0001"
    );

    const returnedVisitor =
        conversationCycleService.evaluate({
            existingSession: {
                conversationId:
                    "conversation_first0001"
            },
            incomingConversationId:
                "conversation_return0003"
            ,
            allowReset: true
        });

    assert.strictEqual(
        returnedVisitor.resetConversionState,
        true,
        "a returning offline visitor with a new cycle must reset AI conversion counters"
    );

    const legacyVisitor =
        conversationCycleService.evaluate({
            existingSession: {
                conversationId: ""
            },
            incomingConversationId:
                "conversation_migrate004",
            allowReset: true
        });

    assert.strictEqual(
        legacyVisitor.resetConversionState,
        true,
        "pre-upgrade sessions must receive one safe conversion-state migration reset"
    );
}


function createGenerated() {
    return {
        replyText:
            "A direct test answer.",
        ctaRecommendation:
            "suppress",
        needsHuman:
            false,
        exitRisk:
            "low",
        asset:
            null,
        investmentHorizon:
            "unknown",
        positionStatus:
            "unknown",
        entryPlan:
            "unknown",
        engagementSignal:
            "neutral",
        reservedValueType:
            "none",
        valueDelivered:
            null,
        question:
            null
    };
}


function commitPolicyReply(state, decision, generated) {
    const advanced =
        conversionStateService.advance({
            state,
            generated,
            decision
        });

    const aiReplyCount =
        Number(state.aiReplyCount || 0) + 1;

    return {
        ...advanced,
        aiReplyCount,
        aiReplyLimitReached:
            aiReplyCount >= 5
    };
}


function testFifthReplyStillForcesWhatsapp() {
    const generated = createGenerated();
    let state =
        conversionStateService
        .createDefaultState();

    let fifthDecision = null;

    for (let turn = 1; turn <= 5; turn += 1) {
        const decision =
            conversionPolicyService.apply({
                generated,
                state,
                latestMessage:
                    `Customer question ${turn}`,
                whatsappAvailable:
                    true
            });

        if (turn === 5) {
            fifthDecision = decision;
        }

        state = commitPolicyReply(
            state,
            decision,
            generated
        );
    }

    assert.strictEqual(
        fifthDecision.finalAiReply,
        true
    );

    assert.strictEqual(
        fifthDecision.mandatoryFinalWhatsapp,
        true
    );

    assert.strictEqual(
        fifthDecision.showWhatsapp,
        true,
        "the fifth AI reply must force the WhatsApp card for a clean conversation cycle"
    );
}


function testOldPersistentStateExplainsRegression() {
    const generated = createGenerated();

    const staleState = {
        ...conversionStateService
            .createDefaultState(),
        aiReplyCount: 4,
        whatsappClicked: true,
        ctaShownCount: 1
    };

    const blocked =
        conversionPolicyService.apply({
            generated,
            state: staleState,
            latestMessage:
                "Fifth question in a reused visitor session"
        });

    assert.strictEqual(
        blocked.showWhatsapp,
        false,
        "a persisted WhatsApp-click flag blocks the final CTA in the reused visitor session"
    );

    const resetState =
        conversionStateService
        .createDefaultState();

    resetState.aiReplyCount = 4;

    const restored =
        conversionPolicyService.apply({
            generated,
            state: resetState,
            latestMessage:
                "Fifth question in a new conversation cycle",
            whatsappAvailable:
                true
        });

    assert.strictEqual(
        restored.showWhatsapp,
        true,
        "a fresh conversation cycle must restore the fifth-reply WhatsApp CTA"
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

    const configSource =
        read("public/js/core/config.js");
    const presenceSource =
        read("public/js/core/presence.js");
    const sessionModelSource =
        read("server/database/models/session-model.js");
    const presenceHandlerSource =
        read("server/socket/presence-handler.js");
    const sessionServiceSource =
        read("server/services/session-service.js");

    assert.match(
        configSource,
        /getConversationId/
    );

    assert.match(
        presenceSource,
        /conversationId:conversationId/
    );

    assert.match(
        sessionModelSource,
        /conversationId/
    );

    assert.match(
        presenceHandlerSource,
        /allowConversationReset/
    );

    assert.match(
        sessionServiceSource,
        /resetConversionState/
    );

    assert.match(
        sessionServiceSource,
        /createDefaultState/
    );
}


function run() {
    testIdentityAndConversationCycleSeparation();
    testCycleDecisionRules();
    testFifthReplyStillForcesWhatsapp();
    testOldPersistentStateExplainsRegression();
    testSourceIntegration();

    console.log(
        "AI Conversation Cycle + Fifth WhatsApp CTA v2.4.2 tests passed."
    );
}


run();
