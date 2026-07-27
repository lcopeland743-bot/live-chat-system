/**
 * Meridian AI Conversation Service
 *
 * Version:
 * v2.4.2
 *
 * Features:
 * - OFF / ASSIST / AUTO
 * - Per-session AI mode
 * - Human takeover
 * - Serialized requests
 * - Latest-only pending Auto reply queue
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


const aiAutoReplyScheduler =
require("./ai-auto-reply-scheduler");


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

    const language =
        generated.customerLanguage
        && generated.customerLanguage.code
        ? generated.customerLanguage.code
        : "unknown";

    const aiMode =
        session
        && session.aiMode
        ? session.aiMode
        : "unknown";

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
        language,
        aiMode,
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
            language,
            aiMode,
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
            language,
            aiMode,
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
            language,
            aiMode,
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
            language,
            aiMode,
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


function timestampValue(
    value
) {
    if (!value) {
        return null;
    }

    const timestamp =
        new Date(value)
        .getTime();

    return Number.isFinite(
        timestamp
    )
    ? timestamp
    : String(value);
}


function createNoActionResult({
    mode = null,
    reason = null,
    details = {}
} = {}) {
    return {
        action:
            "none",
        ...(
            mode
            ? {
                mode
            }
            : {}
        ),
        ...(
            reason
            ? {
                reason
            }
            : {}
        ),
        ...details
    };
}


async function processUserMessageTask({
    payload,
    expectedMode,
    isActive =
        () => true
}) {
    if (!isActive()) {
        return createNoActionResult({
            mode:
                expectedMode,
            reason:
                "auto_reply_cancelled"
        });
    }

    const session =
        await sessionService
        .getSessionByUserId(
            payload.userId
        );

    if (!session) {
        return createNoActionResult({
            mode:
                expectedMode,
            reason:
                "session_not_found"
        });
    }

    const mode =
        aiConfig.normalizeMode(
            session.aiMode
        );

    if (
        mode !== expectedMode
    ) {
        return createNoActionResult({
            mode,
            reason:
                "ai_mode_changed"
        });
    }

    if (mode === "off") {
        return createNoActionResult({
            mode,
            reason:
                "ai_mode_off"
        });
    }

    if (
        session.humanTakeover
        === true
    ) {
        return createNoActionResult({
            mode,
            reason:
                "human_takeover"
        });
    }

    const initialState =
        conversionStateService
        .normalize(
            session.conversionState
        );

    if (
        hasReachedAiReplyLimit(
            session
        )
    ) {
        return createNoActionResult({
            mode,
            reason:
                "ai_reply_limit_reached",
            details: {
                aiReplyCount:
                    initialState
                    .aiReplyCount
            }
        });
    }

    if (!isActive()) {
        return createNoActionResult({
            mode,
            reason:
                "auto_reply_cancelled"
        });
    }

    const history =
        await getConversationHistory(
            payload.userId
        );

    if (!isActive()) {
        return createNoActionResult({
            mode,
            reason:
                "auto_reply_cancelled"
        });
    }

    const generated =
        await buildGeneratedResult({
            session,
            history,
            latestMessage:
                payload.content
        });

    if (
        mode === "assist"
    ) {
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

    if (!isActive()) {
        return createNoActionResult({
            mode,
            reason:
                "auto_reply_cancelled"
        });
    }

    const latestSession =
        await sessionService
        .getSessionByUserId(
            payload.userId
        );

    if (!latestSession) {
        return createNoActionResult({
            mode,
            reason:
                "session_not_found"
        });
    }

    const latestMode =
        aiConfig.normalizeMode(
            latestSession.aiMode
        );

    const latestState =
        conversionStateService
        .normalize(
            latestSession
            .conversionState
        );

    if (
        !isActive()
        || latestMode !== "auto"
        || latestSession.humanTakeover
            === true
        || timestampValue(
            latestSession.aiUpdatedAt
        ) !== timestampValue(
            session.aiUpdatedAt
        )
        || latestState.aiReplyCount
            !== initialState.aiReplyCount
        || hasReachedAiReplyLimit(
            latestSession
        )
    ) {
        return createNoActionResult({
            mode:
                latestMode,
            reason:
                "ai_state_changed"
        });
    }

    if (!isActive()) {
        return createNoActionResult({
            mode:
                latestMode,
            reason:
                "auto_reply_cancelled"
        });
    }

    const committedSession =
        await sessionService
        .commitConversionStateIfAiActive(
            payload.userId,
            generated.nextState,
            "auto"
        );

    if (!committedSession) {
        return createNoActionResult({
            mode:
                latestMode,
            reason:
                "ai_state_changed"
        });
    }

    await recordCommittedResult({
        userId:
            payload.userId,
        generated,
        session:
            committedSession
    });

    return {
        action:
            "reply",
        mode:
            latestMode,
        generated,
        session:
            committedSession
    };
}


function shouldStopPendingAutoReplies(
    result
) {
    if (
        !result
        || result.action === "none"
    ) {
        return true;
    }

    if (
        result.action === "reply"
        && result.session
        && hasReachedAiReplyLimit(
            result.session
        )
    ) {
        return true;
    }

    return false;
}


async function processUserMessage({
    payload,
    onAutoReplyCancelled
}) {
    if (!isEligiblePayload(payload)) {
        return createNoActionResult({
            reason:
                "ineligible_payload"
        });
    }

    const session =
        await sessionService
        .getSessionByUserId(
            payload.userId
        );

    if (!session) {
        return createNoActionResult({
            reason:
                "session_not_found"
        });
    }

    const mode =
        aiConfig.normalizeMode(
            session.aiMode
        );

    if (
        mode === "off"
        || session.humanTakeover
            === true
    ) {
        return createNoActionResult({
            mode,
            reason:
                session.humanTakeover
                ? "human_takeover"
                : "ai_mode_off"
        });
    }

    if (mode === "auto") {
        return aiAutoReplyScheduler
        .schedule({
            userId:
                payload.userId,
            messageId:
                payload.messageId,
            onCancel:
                onAutoReplyCancelled,
            task:
                async schedulerContext => {
                    const result =
                        await enqueue(
                            payload.userId,
                            () =>
                                processUserMessageTask({
                                    payload,
                                    expectedMode:
                                        "auto",
                                    isActive:
                                        schedulerContext
                                        .isActive
                                })
                        );

                    if (
                        shouldStopPendingAutoReplies(
                            result
                        )
                    ) {
                        schedulerContext
                        .stopPending(
                            result
                            && result.reason
                            ? result.reason
                            : "ai_reply_limit_reached"
                        );
                    }

                    return result;
                }
        });
    }

    return enqueue(
        payload.userId,
        () =>
            processUserMessageTask({
                payload,
                expectedMode:
                    mode
            })
    );
}


function cancelAutoReplies(
    userId,
    reason
) {
    return aiAutoReplyScheduler
        .cancel(
            userId,
            reason
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
            .maxAiRepliesPerSession,

        autoReplyQueue:
            aiAutoReplyScheduler
            .getStatus()
    };
}


module.exports = {
    isEligiblePayload,
    generateSuggestion,
    processUserMessage,
    cancelAutoReplies,
    commitSuggestion,
    getPublicStatus
};
