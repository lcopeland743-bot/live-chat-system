/**
 * Meridian Data Retention Configuration
 *
 * Version:
 * v2.3.2
 */

function normalizeBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const normalized =
        String(value)
        .trim()
        .toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
    }

    return fallback;
}


function normalizeInteger(
    value,
    fallback,
    minimum,
    maximum
) {
    const parsed =
        Number(value);

    if (
        !Number.isInteger(parsed)
        || parsed < minimum
        || parsed > maximum
    ) {
        return fallback;
    }

    return parsed;
}


function addDays(date, days) {
    const value =
        date instanceof Date
        ? date
        : new Date(date);

    if (Number.isNaN(value.getTime())) {
        return null;
    }

    return new Date(
        value.getTime()
        + days * 24 * 60 * 60 * 1000
    );
}


const config = {
    enabled:
        normalizeBoolean(
            process.env.DATA_RETENTION_ENABLED,
            true
        ),

    messageRetentionDays:
        normalizeInteger(
            process.env.MESSAGE_RETENTION_DAYS,
            90,
            1,
            3650
        ),

    closedSessionRetentionDays:
        normalizeInteger(
            process.env.CLOSED_SESSION_RETENTION_DAYS,
            30,
            1,
            3650
        ),

    conversionEventRetentionDays:
        normalizeInteger(
            process.env.CONVERSION_EVENT_RETENTION_DAYS,
            180,
            1,
            3650
        ),

    uploadRetentionDays:
        normalizeInteger(
            process.env.UPLOAD_RETENTION_DAYS,
            30,
            1,
            3650
        ),

    runIntervalHours:
        normalizeInteger(
            process.env.DATA_RETENTION_RUN_INTERVAL_HOURS,
            24,
            1,
            168
        ),

    batchSize:
        normalizeInteger(
            process.env.DATA_RETENTION_BATCH_SIZE,
            500,
            50,
            5000
        ),

    calculateMessageExpiry(date = new Date()) {
        return this.enabled
        ? addDays(
            date,
            this.messageRetentionDays
        )
        : null;
    },

    calculateClosedSessionPurgeAt(date = new Date()) {
        return this.enabled
        ? addDays(
            date,
            this.closedSessionRetentionDays
        )
        : null;
    },

    calculateConversionEventExpiry(date = new Date()) {
        return this.enabled
        ? addDays(
            date,
            this.conversionEventRetentionDays
        )
        : null;
    },

    calculateUploadCutoff(date = new Date()) {
        const value =
            date instanceof Date
            ? date
            : new Date(date);

        if (Number.isNaN(value.getTime())) {
            return null;
        }

        return new Date(
            value.getTime()
            - this.uploadRetentionDays
            * 24 * 60 * 60 * 1000
        );
    }
};


module.exports = config;
