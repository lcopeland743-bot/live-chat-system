/**
 * Meridian Conversion Analytics Service
 *
 * Version:
 * v2.4.2
 */

const crypto =
require("crypto");


const ConversionEvent =
require("../database/models/conversion-event-model");


function normalizeLanguage(value) {
    const language =
        String(value || "")
        .trim()
        .toLowerCase();

    if (!language) {
        return "unknown";
    }

    if (
        language === "zh"
        || language.startsWith("zh-")
        || language.startsWith("zh_")
        || language.includes("chinese")
    ) {
        return "zh";
    }

    if (
        language === "en"
        || language.startsWith("en-")
        || language.startsWith("en_")
        || language.includes("english")
    ) {
        return "en";
    }

    if (language === "unknown") {
        return "unknown";
    }

    return "other";
}


function normalizeAiMode(value) {
    const mode =
        String(value || "")
        .trim()
        .toLowerCase();

    return [
        "off",
        "assist",
        "auto"
    ].includes(mode)
        ? mode
        : "unknown";
}


async function record({
    userId,
    sessionId,
    eventType,
    trackingId = null,
    stage = "",
    intent = "unknown",
    asset = null,
    language = "unknown",
    aiMode = "unknown",
    data = {}
}) {
    try {
        return await ConversionEvent.create({
            eventId:
                `conv_${crypto.randomUUID()}`,
            userId,
            sessionId:
                sessionId || userId,
            eventType,
            trackingId,
            stage,
            intent,
            asset,
            language:
                normalizeLanguage(language),
            aiMode:
                normalizeAiMode(aiMode),
            data
        });
    } catch (error) {
        console.error(
            "[Conversion Analytics Error]",
            error
        );

        return null;
    }
}


async function findContext(query) {
    try {
        if (
            !ConversionEvent
            || typeof ConversionEvent.findOne
                !== "function"
        ) {
            return null;
        }

        let request =
            ConversionEvent.findOne(query);

        if (
            request
            && typeof request.sort
                === "function"
        ) {
            request =
                request.sort({
                    createdAt: -1
                });
        }

        if (
            request
            && typeof request.select
                === "function"
        ) {
            request =
                request.select({
                    language: 1,
                    aiMode: 1,
                    stage: 1,
                    intent: 1,
                    asset: 1,
                    createdAt: 1
                });
        }

        if (
            request
            && typeof request.lean
                === "function"
        ) {
            request =
                request.lean();
        }

        return await request;
    }
    catch (error) {
        console.error(
            "[Conversion Context Error]",
            error
        );

        return null;
    }
}


async function findCtaContext(
    userId,
    trackingId
) {
    return await findContext({
        userId:
            String(userId || "").trim(),
        trackingId:
            String(trackingId || "").trim(),
        eventType:
            "cta_shown"
    });
}


async function findLatestContext(userId) {
    return await findContext({
        userId:
            String(userId || "").trim(),
        eventType: {
            $in: [
                "user_turn",
                "value_delivered",
                "cta_shown",
                "cta_clicked"
            ]
        }
    });
}


module.exports = {
    normalizeLanguage,
    normalizeAiMode,
    record,
    findCtaContext,
    findLatestContext
};
