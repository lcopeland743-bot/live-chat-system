/**
 * Meridian Conversation Cycle Service
 *
 * Separates a persistent visitor identity from a temporary
 * AI conversion cycle. A normal refresh keeps the same cycle;
 * a new browser-tab lifecycle can start a fresh AI five-reply
 * and WhatsApp CTA sequence without creating a new visitor.
 *
 * Version: v1.0.0
 */

const VALID_CONVERSATION_ID =
/^conversation_[a-z0-9_-]{8,100}$/i;


function normalizeConversationId(value) {
    const conversationId =
        String(value || "").trim();

    return VALID_CONVERSATION_ID
        .test(conversationId)
        ? conversationId
        : "";
}


function evaluate({
    existingSession,
    incomingConversationId,
    allowReset
}) {
    const incoming =
        normalizeConversationId(
            incomingConversationId
        );

    const existing =
        normalizeConversationId(
            existingSession
            ? existingSession.conversationId
            : ""
        );

    if (!existingSession) {
        return {
            resetConversionState: false,
            effectiveConversationId:
                incoming,
            reason:
                "new_visitor_session"
        };
    }

    if (!incoming) {
        return {
            resetConversionState: false,
            effectiveConversationId:
                existing,
            reason:
                "missing_incoming_cycle"
        };
    }

    if (existing === incoming) {
        return {
            resetConversionState: false,
            effectiveConversationId:
                existing,
            reason:
                "same_cycle"
        };
    }

    if (allowReset !== true) {
        return {
            resetConversionState: false,
            effectiveConversationId:
                existing,
            reason:
                "visitor_still_active"
        };
    }

    return {
        resetConversionState: true,
        effectiveConversationId:
            incoming,
        reason:
            existing
            ? "new_cycle_after_offline"
            : "legacy_session_migration"
    };
}


module.exports = {
    normalizeConversationId,
    evaluate
};
