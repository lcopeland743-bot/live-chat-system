/**
 * Meridian Conversion Configuration
 *
 * Version:
 * v2.4.2
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

    if (
        digits.length < 7
        || digits.length > 15
    ) {
        return "";
    }

    return digits;
}

const replyCharacterLimit = normalizeInteger(
    process.env.AI_REPLY_CHARACTER_LIMIT,
    200,
    200,
    200
);

const environmentWhatsappNumber =
    normalizePhoneNumber(
        process.env.AI_WHATSAPP_NUMBER
    );

const environmentWhatsappEnabled =
    normalizeBoolean(
        process.env.AI_WHATSAPP_ENABLED,
        Boolean(environmentWhatsappNumber)
    )
    && Boolean(environmentWhatsappNumber);

module.exports = {
    policyVersion: "1.1.0",
    promptVersion: "1.2.1",

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
        enabled: environmentWhatsappEnabled,
        phoneNumber: environmentWhatsappNumber,
        clickEndpoint:
            process.env.AI_WHATSAPP_CLICK_ENDPOINT
            || "/api/conversion/whatsapp-click",
        redirectPath: "/go/whatsapp"
    },

    normalizePhoneNumber
};
