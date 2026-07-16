/**
 * Meridian AI Conversation Service
 *
 * Version:
 * v2.3.4
 *
 * Features:
 * - OFF / ASSIST / AUTO
 * - Per-session AI mode
 * - Human takeover
 * - Serialized requests
 * - Structured conversion decisions
 * - OpenAI Web Search
 * - Dynamic WhatsApp CTA
 */

const aiConfig =
require("../config/ai-config");


const conversionConfig =
require("../config/conversion-config");


const openaiService =
require("./openai-service");


const messageService =
require("./message-service");


const sessionService =
require("./session-service");


const conversionStateService =
require("./conversion-state-service");


const conversionPolicyService =
require("./conversion-policy-service");


const whatsappConversionService =
require("./whatsapp-conversion-service");


const conversionAnalyticsService =
require("./conversion-analytics-service");


const {
    countCharacters
}
=
require("../utils/conversion-text");


const requestQueues =
new Map();


const pendingSuggestions =
new Map();


function enqueue(userId, task) {
    const previous =
        requestQueues.get(userId)
        || Promise.resolve();

    const current =
        previous
        .catch(() => {})
        .then(task);

    requestQueues.set(
        userId,
        current
    );

    const cleanup = () => {
        if (
            requestQueues.get(userId)
            === current
        ) {
            requestQueues.delete(userId);
        }
    };

    current.then(
        cleanup,
        cleanup
    );

    return current;
}


function isEligiblePayload(payload) {
    if (
        !payload
        || payload.type !== "text"
        || typeof payload.content !== "string"
        || !payload.content.trim()
    ) {
        return false;
    }

    const metadata =
        payload.metadata || {};

    if (
        metadata.interaction
            === "investor-profile"
        || metadata.aiSkip === true
    ) {
        return false;
    }

    return true;
}


function hasReachedAiReplyLimit(session) {
    const state =
        conversionStateService
        .normalize(
            session
            ? session.conversionState
            : null
        );

    return (
        state.aiReplyLimitReached === true
        || state.aiReplyCount >=
            conversionConfig
            .maxAiRepliesPerSession
    );
}


function createAiReplyLimitError() {
    const error =
        new Error(
            "This conversation has reached the AI reply limit."
        );

    error.code =
        "AI_REPLY_LIMIT_REACHED";

    error.status =
        409;

    return error;
}


async function getConversationHistory(userId) {
    const messages =
        await messageService
        .getRecentMessages(
            userId,
            aiConfig.maxHistoryMessages
        );

    return messages.map(message => ({
        sender:
            message.sender,
        content:
            message.content
    }));
}


function createReplyMetadata({
    generated,
    decision,
    nextState
}) {
    return {
        source:
            "openai",

        model:
            generated.model,

        responseId:
            generated.responseId,

        webSearchUsed:
            generated.webSearchUsed === true,

        freshDataRequired:
            generated.freshDataRequired === true,

        searchedAt:
            generated.searchedAt,

        sources:
            generated.sources || [],

        characterCount:
            countCharacters(
                decision.replyText
            ),

        characterLimit:
            aiConfig.replyCharacterLimit,

        dataRequest:
            generated.serverDataRequest,

        language:
            generated.customerLanguage
            ? generated.customerLanguage.code
            : "en",

        conversion: {
            stage:
                nextState.stage,
            intent:
                nextState.intent,
            asset:
                nextState.asset,
            exitRisk:
                nextState.exitRisk,
            decisionType:
                decision.decisionType,
            showWhatsapp:
                decision.showWhatsapp,
            ctaTurn:
                decision.currentTurn,
            aiReplyNumber:
                decision.aiReplyNumber,
            finalAiReply:
                decision.finalAiReply === true,
            mandatoryFinalWhatsapp:
                decision.mandatoryFinalWhatsapp === true,
            trackingId:
                decision.trackingId,
            doNotPush:
                nextState.doNotPush,
            whatsappClicked:
                nextState.whatsappClicked
        }
    };
}


async function buildGeneratedResult({
    session,
    history,
    latestMessage
}) {
    const state =
        conversionStateService.normalize(
            session.conversionState
        );

    const currentTurn =
        state.eligibleTurnCount + 1;

    const hardSignals =
        conversionPolicyService
        .detectHardSignals(
            latestMessage
        );

    const generated =
        await openaiService
        .generateConversionReply({
            messages: history,
            state,
            currentTurn,
            hardSignals
        });

    const decision =
        conversionPolicyService.apply({
            generated,
            state,
            latestMessage
        });

    const linkCard =
        whatsappConversionService
        .createCard({
            generated,
            state,
            decision,
            latestMessage
        });

    if (linkCard) {
        decision.trackingId =
            linkCard.metadata.trackingId;
    }

    const nextState =
        conversionStateService.advance({
            state,
            generated,
            decision
        });

    const metadata =
        createReplyMetadata({
            generated,
            decision,
            nextState
        });

    return {
        ...generated,
        text:
            decision.replyText,
        replyText:
            decision.replyText,
        decision,
        nextState,
        linkCard,
        metadata
    };
}


function pendingKey(
    userId,
    responseId
) {
    return `${userId}:${responseId}`;
}


function storePendingSuggestion({
    userId,
    expectedMode,
    generated
}) {
    if (!generated.responseId) {
        return;
    }

    const key =
        pendingKey(
            userId,
            generated.responseId
        );

    pendingSuggestions.set(
        key,
        {
            userId,
            expectedMode,
            content:
                generated.text,
            generated,
            expiresAt:
                Date.now()
                + conversionConfig
                    .pendingSuggestionTtlMs
        }
    );

    const timer =
        setTimeout(
            () => {
                const current =
                    pendingSuggestions.get(key);

                if (
                    current
                    && current.expiresAt <= Date.now()
                ) {
                    pendingSuggestions.delete(key);
                }
            },
            conversionConfig
                .pendingSuggestionTtlMs
                + 1000
        );

    timer.unref();
}


async function recordCommittedResult({
    userId,
    generated,
    session
}) {
    const state =
        generated.nextState;

    await conversionAnalyticsService.record({
        userId,
        sessionId:
            userId,
        eventType:
            "user_turn",
        stage:
            state.stage,
        intent:
            state.intent,
        asset:
            state.asset,
        data: {
            turn:
                state.eligibleTurnCount,
            decisionType:
                generated.decision
                    .decisionType
        }
    });

    if (generated.webSearchUsed) {
        await conversionAnalyticsService.record({
            userId,
            sessionId:
                userId,
            eventType:
                "web_search_used",
            stage:
                state.stage,
            intent:
                state.intent,
            asset:
                state.asset,
            data: {
                sources:
                    generated.sources
                    ? generated.sources.length
                    : 0,
                dataRequest:
                    generated.serverDataRequest
            }
        });
    }

    if (generated.valueDelivered) {
        await conversionAnalyticsService.record({
            userId,
            sessionId:
                userId,
            eventType:
                "value_delivered",
            stage:
                state.stage,
            intent:
                state.intent,
            asset:
                state.asset,
            data: {
                value:
                    generated.valueDelivered
            }
        });
    }

    if (generated.decision.showWhatsapp) {
        await conversionAnalyticsService.record({
            userId,
            sessionId:
                userId,
            eventType:
                "cta_shown",
            trackingId:
                generated.decision
                    .trackingId,
            stage:
                state.stage,
            intent:
                state.intent,
            asset:
                state.asset,
            data: {
                turn:
                    generated.decision
                    .currentTurn,
                variant:
                    generated.linkCard
                    ? generated.linkCard
                        .metadata
                        .ctaVariant
                    : null
            }
        });
    } else if (
        generated.decision.decisionType
        === "suppress"
    ) {
        await conversionAnalyticsService.record({
            userId,
            sessionId:
                userId,
            eventType:
                generated.decision.doNotPush
                ? "whatsapp_refused"
                : "cta_suppressed",
            stage:
                state.stage,
            intent:
                state.intent,
            asset:
                state.asset,
            data: {
                reason:
                    generated.decision
                    .suppressReason
            }
        });
    }

    return session;
}


async function generateSuggestion(
    userId,
    options = {}
) {
    return enqueue(
        userId,
        async () => {
            const session =
                await sessionService
                .getSessionByUserId(
                    userId
                );

            if (!session) {
                const error =
                    new Error(
                        "Session not found"
                    );

                error.code =
                    "AI_SESSION_NOT_FOUND";

                throw error;
            }

            if (
                hasReachedAiReplyLimit(
                    session
                )
            ) {
                throw createAiReplyLimitError();
            }

            const history =
                await getConversationHistory(
                    userId
                );

            const generated =
                await buildGeneratedResult({
                    session,
                    history,
                    latestMessage:
                        options.latestMessage
                        || (
                            history.length
                            ? history[
                                history.length - 1
                            ].content
                            : ""
                        )
                });

            storePendingSuggestion({
                userId,
                expectedMode:
                    session.aiMode,
                generated
            });

            return generated;
        }
    );
}


async function processUserMessage({
    payload
}) {
    if (!isEligiblePayload(payload)) {
        return {
            action: "none"
        };
    }

    return enqueue(
        payload.userId,
        async () => {
            const session =
                await sessionService
                .getSessionByUserId(
                    payload.userId
                );

            if (!session) {
                return {
                    action: "none"
                };
            }

            const mode =
                aiConfig.normalizeMode(
                    session.aiMode
                );

            if (
                mode === "off"
                || session.humanTakeover === true
            ) {
                return {
                    action: "none",
                    mode
                };
            }

            if (
                hasReachedAiReplyLimit(
                    session
                )
            ) {
                return {
                    action: "none",
                    mode,
                    reason:
                        "ai_reply_limit_reached",
                    aiReplyCount:
                        conversionStateService
                        .normalize(
                            session.conversionState
                        )
                        .aiReplyCount
                };
            }

            const history =
                await getConversationHistory(
                    payload.userId
                );

            const generated =
                await buildGeneratedResult({
                    session,
                    history,
                    latestMessage:
                        payload.content
                });

            if (mode === "assist") {
                if (
                    generated.decision.doNotPush
                    === true
                ) {
                    await sessionService
                        .setConversionDoNotPush(
                            payload.userId,
                            true
                        );
                }

                storePendingSuggestion({
                    userId:
                        payload.userId,
                    expectedMode:
                        "assist",
                    generated
                });

                return {
                    action:
                        "suggestion",
                    mode,
                    generated
                };
            }

            const committedSession =
                await sessionService
                .commitConversionStateIfAiActive(
                    payload.userId,
                    generated.nextState,
                    "auto"
                );

            if (!committedSession) {
                return {
                    action: "none",
                    mode
                };
            }

            await recordCommittedResult({
                userId:
                    payload.userId,
                generated,
                session:
                    committedSession
            });

            return {
                action: "reply",
                mode,
                generated,
                session:
                    committedSession
            };
        }
    );
}


async function commitSuggestion({
    userId,
    responseId,
    content
}) {
    return enqueue(
        userId,
        async () => {
            const key =
                pendingKey(
                    userId,
                    responseId
                );

            const pending =
                pendingSuggestions.get(key);

            if (
                !pending
                || pending.expiresAt <= Date.now()
            ) {
                pendingSuggestions.delete(key);
                return null;
            }

            if (
                String(content || "").trim()
                !== String(
                    pending.content || ""
                ).trim()
            ) {
                return null;
            }

            const committedSession =
                await sessionService
                .commitConversionStateIfAiActive(
                    userId,
                    pending.generated.nextState,
                    pending.expectedMode
                );

            if (!committedSession) {
                return null;
            }

            pendingSuggestions.delete(key);

            await recordCommittedResult({
                userId,
                generated:
                    pending.generated,
                session:
                    committedSession
            });

            return {
                generated:
                    pending.generated,
                session:
                    committedSession,
                linkCard:
                    pending.generated.linkCard
            };
        }
    );
}


function getPublicStatus() {
    return {
        configured:
            openaiService.isConfigured(),

        model:
            aiConfig.model,

        defaultMode:
            aiConfig.defaultMode,

        modes:
            aiConfig.modes,

        webSearchEnabled:
            aiConfig.webSearch.enabled,

        replyCharacterLimit:
            aiConfig.replyCharacterLimit,

        whatsappEnabled:
            conversionConfig
            .whatsapp.enabled,

        forceDecisionTurn:
            conversionConfig
            .forceDecisionTurn,

        maxCtaPerSession:
            conversionConfig
            .maxCtaPerSession,

        maxAiRepliesPerSession:
            conversionConfig
            .maxAiRepliesPerSession
    };
}


module.exports = {
    isEligiblePayload,
    generateSuggestion,
    processUserMessage,
    commitSuggestion,
    getPublicStatus
};
