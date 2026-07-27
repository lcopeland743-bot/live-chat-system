/**
 * Meridian IP Geolocation Configuration
 *
 * Server-side approximate location lookup for the admin console.
 * The lookup must never block chat delivery or Socket connection.
 *
 * Version: v1.0.0
 */

function parseBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const normalized =
        String(value)
        .trim()
        .toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
    }

    return fallback;
}


function parseInteger(value, fallback, minimum, maximum) {
    const number = Number.parseInt(value, 10);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return Math.min(
        maximum,
        Math.max(minimum, number)
    );
}


const cacheHours =
    parseInteger(
        process.env.IP_GEOLOCATION_CACHE_HOURS,
        168,
        1,
        24 * 365
    );

const negativeCacheMinutes =
    parseInteger(
        process.env.IP_GEOLOCATION_NEGATIVE_CACHE_MINUTES,
        60,
        1,
        24 * 60
    );


module.exports = {
    enabled:
        parseBoolean(
            process.env.IP_GEOLOCATION_ENABLED,
            true
        ),

    provider: "ipwhois",

    endpoint:
        String(
            process.env.IP_GEOLOCATION_ENDPOINT
            || "https://ipwho.is"
        )
        .trim()
        .replace(/\/+$/, ""),

    language:
        String(
            process.env.IP_GEOLOCATION_LANGUAGE
            || "zh-CN"
        )
        .trim()
        .slice(0, 16),

    timeoutMs:
        parseInteger(
            process.env.IP_GEOLOCATION_TIMEOUT_MS,
            2500,
            500,
            10000
        ),

    cacheTtlMs:
        cacheHours
        * 60
        * 60
        * 1000,

    negativeCacheTtlMs:
        negativeCacheMinutes
        * 60
        * 1000
};
