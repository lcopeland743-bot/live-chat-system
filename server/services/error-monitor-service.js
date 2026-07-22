/**
 * Meridian Error Monitor Service
 *
 * Version:
 * v2.3.10
 *
 * Features:
 * - Structured warning, error, and critical records
 * - Fingerprint aggregation
 * - Sensitive context redaction
 * - MongoDB persistence with an in-memory fallback buffer
 */

const crypto =
require("crypto");


const errorMonitorConfig =
require("../config/error-monitor-config");


const dataRetentionConfig =
require("../config/data-retention-config");


let ErrorEvent =
require("../database/models/error-event-model");


const memoryBuffer = [];


const levelWeights = {
    warning: 1,
    error: 2,
    critical: 3
};


const sensitiveKeys =
new Set([
    "password",
    "passwordhash",
    "sessionsecret",
    "secret",
    "token",
    "accesstoken",
    "refreshtoken",
    "authorization",
    "cookie",
    "setcookie",
    "apikey",
    "openaiapikey",
    "content",
    "message",
    "messages",
    "body",
    "prompt",
    "latestmessage",
    "reply",
    "replytext",
    "history",
    "conversation"
]);


function truncate(value, maximum) {
    const text =
        String(
            value === undefined
            || value === null
            ? ""
            : value
        );

    if (text.length <= maximum) {
        return text;
    }

    return text.slice(
        0,
        Math.max(
            0,
            maximum - 14
        )
    ) + "...[truncated]";
}


function normalizeKey(key) {
    return String(key || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}


function isSensitiveKey(key) {
    return sensitiveKeys.has(
        normalizeKey(key)
    );
}


function redactString(
    value,
    maximum = errorMonitorConfig.maxStringLength
) {
    return truncate(
        String(value)
        .replace(
            /Bearer\s+[A-Za-z0-9._~+\/-]+/gi,
            "Bearer [REDACTED]"
        )
        .replace(
            /\bsk-[A-Za-z0-9_-]{8,}\b/g,
            "[REDACTED_API_KEY]"
        )
        .replace(
            /([?&](?:token|key|secret|password)=)[^&\s]+/gi,
            "$1[REDACTED]"
        ),
        maximum
    );
}


function sanitizeValue(
    value,
    depth = 0,
    seen = new WeakSet()
) {
    if (
        value === null
        || value === undefined
    ) {
        return value;
    }

    if (typeof value === "string") {
        return redactString(value);
    }

    if (
        typeof value === "number"
        || typeof value === "boolean"
    ) {
        return value;
    }

    if (typeof value === "bigint") {
        return String(value);
    }

    if (typeof value === "function") {
        return "[Function]";
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
        ? null
        : value.toISOString();
    }

    if (value instanceof Error) {
        return {
            name:
                truncate(
                    value.name || "Error",
                    120
                ),
            code:
                value.code
                ? truncate(value.code, 160)
                : null,
            message:
                truncate(
                    value.message || "Error",
                    errorMonitorConfig.maxMessageLength
                )
        };
    }

    if (depth >= errorMonitorConfig.maxContextDepth) {
        return "[Max Depth]";
    }

    if (typeof value !== "object") {
        return redactString(value);
    }

    if (seen.has(value)) {
        return "[Circular]";
    }

    seen.add(value);

    if (Array.isArray(value)) {
        const result = value
        .slice(
            0,
            errorMonitorConfig.maxContextKeys
        )
        .map(
            item => sanitizeValue(
                item,
                depth + 1,
                seen
            )
        );

        seen.delete(value);
        return result;
    }

    const result = {};
    const entries =
        Object.entries(value)
        .slice(
            0,
            errorMonitorConfig.maxContextKeys
        );

    for (const [key, item] of entries) {
        if (isSensitiveKey(key)) {
            result[key] = "[REDACTED]";
            continue;
        }

        result[key] =
            sanitizeValue(
                item,
                depth + 1,
                seen
            );
    }

    seen.delete(value);
    return result;
}


function normalizeLevel(level) {
    const normalized =
        String(level || "error")
        .trim()
        .toLowerCase();

    return levelWeights[normalized]
    ? normalized
    : "error";
}


function normalizeSource(source) {
    const value =
        truncate(
            String(source || "application")
            .trim(),
            180
        );

    return value || "application";
}


function getErrorMessage(error, fallback) {
    if (
        typeof fallback === "string"
        && fallback.trim()
    ) {
        return fallback.trim();
    }

    if (
        error
        && typeof error.message === "string"
        && error.message.trim()
    ) {
        return error.message.trim();
    }

    if (typeof error === "string") {
        return error.trim() || "Unknown error";
    }

    return "Unknown error";
}


function normalizeStack(
    error,
    safeMessage = null
) {
    if (
        !error
        || typeof error.stack !== "string"
    ) {
        return null;
    }

    let stack =
        error.stack;

    if (safeMessage) {
        const lines =
            stack.split("\n");

        lines[0] =
            `${error.name || "Error"}: ${safeMessage}`;

        stack =
            lines.join("\n");
    }

    return redactString(
        stack,
        errorMonitorConfig.maxStackLength
    );
}


function createFingerprint({
    source,
    code,
    name,
    message,
    stack
}) {
    const firstStackFrame =
        String(stack || "")
        .split("\n")
        .slice(1, 3)
        .join("|")
        .replace(/:\d+:\d+/g, ":#:#");

    const sourceText = [
        String(source || "").toLowerCase(),
        String(code || "").toLowerCase(),
        String(name || "").toLowerCase(),
        String(message || "")
            .toLowerCase()
            .replace(/\b\d{2,}\b/g, "#"),
        firstStackFrame.toLowerCase()
    ].join("|");

    return crypto
    .createHash("sha256")
    .update(sourceText)
    .digest("hex");
}


function prepareRecord({
    level = "error",
    source = "application",
    error = null,
    code = null,
    message = null,
    context = {},
    recovered = false
} = {}) {
    const normalizedLevel =
        normalizeLevel(level);

    const normalizedSource =
        normalizeSource(source);

    const normalizedMessage =
        truncate(
            getErrorMessage(
                error,
                message
            ),
            errorMonitorConfig.maxMessageLength
        );

    const normalizedName =
        truncate(
            error
            && error.name
            ? error.name
            : "Error",
            120
        );

    const normalizedCode =
        code
        || (
            error
            && error.code
        )
        || null;

    const normalizedStack =
        normalizeStack(
            error,
            message
            ? normalizedMessage
            : null
        );

    const fingerprint =
        createFingerprint({
            source:
                normalizedSource,
            code:
                normalizedCode,
            name:
                normalizedName,
            message:
                normalizedMessage,
            stack:
                normalizedStack
        });

    return {
        eventId:
            `err_${crypto.randomUUID()}`,
        fingerprint,
        level:
            normalizedLevel,
        source:
            normalizedSource,
        code:
            normalizedCode
            ? truncate(normalizedCode, 160)
            : null,
        name:
            normalizedName,
        message:
            redactString(normalizedMessage),
        stack:
            normalizedStack,
        context:
            sanitizeValue(context) || {},
        recovered:
            recovered === true,
        occurredAt:
            new Date()
    };
}


function calculateExpiry(date) {
    if (
        dataRetentionConfig
        && typeof dataRetentionConfig
            .calculateErrorEventExpiry === "function"
    ) {
        return dataRetentionConfig
        .calculateErrorEventExpiry(date);
    }

    return null;
}


async function persistPrepared(prepared) {
    const now =
        prepared.occurredAt
        instanceof Date
        ? prepared.occurredAt
        : new Date();

    const update = {
        $setOnInsert: {
            eventId:
                prepared.eventId,
            fingerprint:
                prepared.fingerprint,
            firstSeenAt:
                now
        },
        $set: {
            level:
                prepared.level,
            source:
                prepared.source,
            code:
                prepared.code,
            name:
                prepared.name,
            message:
                prepared.message,
            stack:
                prepared.stack,
            context:
                prepared.context,
            recovered:
                prepared.recovered,
            lastSeenAt:
                now,
            resolved:
                false,
            resolvedAt:
                null,
            expiresAt:
                calculateExpiry(now)
        },
        $inc: {
            occurrenceCount:
                1
        }
    };

    try {
        return await ErrorEvent
        .findOneAndUpdate(
            {
                fingerprint:
                    prepared.fingerprint
            },
            update,
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );
    } catch (error) {
        if (
            !error
            || error.code !== 11000
        ) {
            throw error;
        }

        return await ErrorEvent
        .findOneAndUpdate(
            {
                fingerprint:
                    prepared.fingerprint
            },
            {
                $set:
                    update.$set,
                $inc:
                    update.$inc
            },
            {
                new: true
            }
        );
    }
}


function bufferPrepared(prepared) {
    memoryBuffer.push(prepared);

    while (
        memoryBuffer.length
        > errorMonitorConfig.memoryBufferLimit
    ) {
        memoryBuffer.shift();
    }
}


async function record(details = {}) {
    if (!errorMonitorConfig.enabled) {
        return null;
    }

    const prepared =
        prepareRecord(details);

    try {
        const persisted =
            await persistPrepared(
                prepared
            );

        if (memoryBuffer.length > 0) {
            flushBuffer()
            .catch(() => {});
        }

        return persisted;
    } catch (persistenceError) {
        bufferPrepared(prepared);

        console.warn(
            "[Error Monitor Buffer]",
            {
                source:
                    prepared.source,
                level:
                    prepared.level,
                buffered:
                    memoryBuffer.length,
                persistenceError:
                    truncate(
                        persistenceError
                        && persistenceError.message
                        ? persistenceError.message
                        : persistenceError,
                        300
                    )
            }
        );

        return {
            buffered: true,
            eventId:
                prepared.eventId,
            fingerprint:
                prepared.fingerprint
        };
    }
}


async function flushBuffer() {
    if (
        !errorMonitorConfig.enabled
        || memoryBuffer.length === 0
    ) {
        return {
            attempted: 0,
            persisted: 0,
            remaining:
                memoryBuffer.length
        };
    }

    const pending =
        memoryBuffer.splice(
            0,
            memoryBuffer.length
        );

    let persisted = 0;

    for (
        let index = 0;
        index < pending.length;
        index += 1
    ) {
        try {
            await persistPrepared(
                pending[index]
            );
            persisted += 1;
        } catch (error) {
            const remaining =
                pending.slice(index);

            for (const item of remaining) {
                bufferPrepared(item);
            }

            break;
        }
    }

    return {
        attempted:
            pending.length,
        persisted,
        remaining:
            memoryBuffer.length
    };
}


function parseResolved(value) {
    if (
        value === undefined
        || value === null
        || value === ""
        || value === "all"
    ) {
        return null;
    }

    if (
        value === true
        || String(value).toLowerCase() === "true"
    ) {
        return true;
    }

    if (
        value === false
        || String(value).toLowerCase() === "false"
    ) {
        return false;
    }

    return null;
}


function normalizeListLimit(value) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
        return errorMonitorConfig.listLimit;
    }

    return Math.max(
        1,
        Math.min(
            parsed,
            200
        )
    );
}


async function list({
    limit = errorMonitorConfig.listLimit,
    level = null,
    resolved = false,
    source = null
} = {}) {
    const query = {};
    const normalizedResolved =
        parseResolved(resolved);

    if (normalizedResolved !== null) {
        query.resolved =
            normalizedResolved;
    }

    const normalizedLevel =
        String(level || "")
        .trim()
        .toLowerCase();

    if (levelWeights[normalizedLevel]) {
        query.level =
            normalizedLevel;
    }

    const normalizedSource =
        String(source || "")
        .trim();

    if (normalizedSource) {
        query.source =
            normalizedSource;
    }

    const eventsQuery =
        ErrorEvent
        .find(query)
        .sort({
            lastSeenAt: -1
        })
        .limit(
            normalizeListLimit(limit)
        );

    const eventsPromise =
        typeof eventsQuery.lean === "function"
        ? eventsQuery.lean()
        : eventsQuery;

    const [
        events,
        unresolved,
        warning,
        error,
        critical
    ] = await Promise.all([
        eventsPromise,
        ErrorEvent.countDocuments({
            resolved: false
        }),
        ErrorEvent.countDocuments({
            resolved: false,
            level: "warning"
        }),
        ErrorEvent.countDocuments({
            resolved: false,
            level: "error"
        }),
        ErrorEvent.countDocuments({
            resolved: false,
            level: "critical"
        })
    ]);

    return {
        events:
            Array.isArray(events)
            ? events
            : [],
        summary: {
            unresolved,
            warning,
            error,
            critical,
            buffered:
                memoryBuffer.length
        }
    };
}


async function resolveEvent(eventId) {
    const normalizedEventId =
        String(eventId || "")
        .trim();

    if (!normalizedEventId) {
        return null;
    }

    return await ErrorEvent
    .findOneAndUpdate(
        {
            eventId:
                normalizedEventId
        },
        {
            $set: {
                resolved:
                    true,
                resolvedAt:
                    new Date()
            }
        },
        {
            new: true
        }
    );
}


async function resolveAll() {
    const result =
        await ErrorEvent
        .updateMany(
            {
                resolved: false
            },
            {
                $set: {
                    resolved:
                        true,
                    resolvedAt:
                        new Date()
                }
            }
        );

    return {
        matchedCount:
            result.matchedCount
            || result.n
            || 0,
        modifiedCount:
            result.modifiedCount
            || result.nModified
            || 0
    };
}


function getStatus() {
    return {
        enabled:
            errorMonitorConfig.enabled,
        retentionDays:
            errorMonitorConfig.retentionDays,
        buffered:
            memoryBuffer.length,
        memoryBufferLimit:
            errorMonitorConfig.memoryBufferLimit
    };
}


function captureWarning(details = {}) {
    return record({
        ...details,
        level: "warning"
    });
}


function captureError(details = {}) {
    return record({
        ...details,
        level: "error"
    });
}


function captureCritical(details = {}) {
    return record({
        ...details,
        level: "critical"
    });
}


function setModelForTests(model) {
    ErrorEvent = model;
}


function resetForTests() {
    memoryBuffer.splice(
        0,
        memoryBuffer.length
    );
}


module.exports = {
    record,
    captureWarning,
    captureError,
    captureCritical,
    flushBuffer,
    list,
    resolveEvent,
    resolveAll,
    getStatus,
    setModelForTests,
    resetForTests,
    _private: {
        sanitizeValue,
        prepareRecord,
        createFingerprint,
        redactString,
        isSensitiveKey,
        normalizeListLimit
    }
};
