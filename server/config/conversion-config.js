/**
 * Meridian Conversion Configuration
 *
 * Version:
 * v2.3.3
 */

function normalizeInteger(value, fallback, minimum, maximum) {
    const parsed = Number(value);

    if (
        !Number.isInteger(parsed)
        || parsed < minimum
        || parsed > maximum
    ) {
        return fallback;
    }

    return parsed;
}

function normalizeBoolean(value, fallback) {
    if (
        value === undefined
        || value === null
        || value === ""
    ) {
        return fallback;
    }

    return String(value).toLowerCase() === "true";
}

function normalizePhoneNumber(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits || "19342032173";
}

const replyCharacterLimit = normalizeInteger(
    process.env.AI_REPLY_CHARACTER_LIMIT,
    100,
    40,
    100
);

module.exports = {
    policyVersion: "1.0.0",
    promptVersion: "1.0.0",

    replyCharacterLimit,
    maxQuestionsPerReply: 1,

    maxAiRepliesPerSession: normalizeInteger(
        process.env.AI_MAX_REPLIES_PER_SESSION,
        5,
        1,
        20
    ),

    forceDecisionTurn: normalizeInteger(
        process.env.CONVERSION_FORCE_DECISION_TURN,
        3,
        2,
        5
    ),

    maxCtaPerSession: normalizeInteger(
        process.env.CONVERSION_MAX_CTA_PER_SESSION,
        2,
        1,
        3
    ),

    ctaCooldownTurns: normalizeInteger(
        process.env.CONVERSION_CTA_COOLDOWN_TURNS,
        2,
        1,
        5
    ),

    pendingSuggestionTtlMs: normalizeInteger(
        process.env.CONVERSION_SUGGESTION_TTL_MS,
        15 * 60 * 1000,
        60 * 1000,
        60 * 60 * 1000
    ),

    whatsapp: {
        enabled: normalizeBoolean(
            process.env.AI_WHATSAPP_ENABLED,
            true
        ),

        phoneNumber: normalizePhoneNumber(
            process.env.AI_WHATSAPP_NUMBER
            || "19342032173"
        ),

        clickEndpoint:
            process.env.AI_WHATSAPP_CLICK_ENDPOINT
            || "/api/conversion/whatsapp-click"
    }
};
