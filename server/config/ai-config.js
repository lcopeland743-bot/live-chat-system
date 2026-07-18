/**
 * Meridian AI Configuration
 *
 * Version:
 * v2.3.7
 */

const conversionConfig =
require("./conversion-config");


const AI_MODES = [
    "off",
    "assist",
    "auto"
];


const REASONING_LEVELS = [
    "none",
    "low",
    "medium",
    "high",
    "xhigh"
];


const SEARCH_CONTEXT_SIZES = [
    "low",
    "medium",
    "high"
];


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


function normalizeMode(value) {
    return AI_MODES.includes(value)
        ? value
        : "off";
}


function normalizeReasoning(value) {
    return REASONING_LEVELS.includes(value)
        ? value
        : "low";
}


function normalizeSearchContextSize(value) {
    return SEARCH_CONTEXT_SIZES.includes(value)
        ? value
        : "medium";
}


module.exports = {
    modes: AI_MODES,

    model:
        process.env.OPENAI_MODEL
        || "gpt-5.6",

    defaultMode: normalizeMode(
        process.env.AI_DEFAULT_MODE
        || "auto"
    ),

    maxHistoryMessages: normalizeInteger(
        process.env.AI_MAX_HISTORY_MESSAGES,
        20,
        2,
        50
    ),

    maxOutputTokens: normalizeInteger(
        process.env.AI_MAX_OUTPUT_TOKENS,
        900,
        200,
        4000
    ),

    reasoningEffort: normalizeReasoning(
        process.env.AI_REASONING_EFFORT
        || "low"
    ),

    requestTimeoutMs: normalizeInteger(
        process.env.AI_REQUEST_TIMEOUT_MS,
        60000,
        5000,
        120000
    ),

    replyCharacterLimit:
        conversionConfig.replyCharacterLimit,

    webSearch: {
        enabled: normalizeBoolean(
            process.env.AI_WEB_SEARCH_ENABLED,
            true
        ),

        contextSize: normalizeSearchContextSize(
            process.env.AI_WEB_SEARCH_CONTEXT_SIZE
            || "medium"
        ),

        maxSources: normalizeInteger(
            process.env.AI_WEB_SEARCH_MAX_SOURCES,
            3,
            1,
            8
        )
    },

    normalizeMode
};
