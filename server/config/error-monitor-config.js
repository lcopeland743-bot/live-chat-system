/**
 * Meridian Error Monitor Configuration
 *
 * Version:
 * v2.3.10
 */

function normalizeBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const normalized = String(value).trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
    }

    return fallback;
}


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


module.exports = {
    enabled:
        normalizeBoolean(
            process.env.ERROR_MONITOR_ENABLED,
            true
        ),

    retentionDays:
        normalizeInteger(
            process.env.ERROR_EVENT_RETENTION_DAYS,
            30,
            1,
            3650
        ),

    memoryBufferLimit:
        normalizeInteger(
            process.env.ERROR_MONITOR_MEMORY_BUFFER_LIMIT,
            100,
            10,
            1000
        ),

    listLimit:
        normalizeInteger(
            process.env.ERROR_MONITOR_LIST_LIMIT,
            50,
            1,
            200
        ),

    maxMessageLength: 1000,
    maxStackLength: 8000,
    maxStringLength: 1000,
    maxContextDepth: 5,
    maxContextKeys: 60
};
