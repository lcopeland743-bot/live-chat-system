/**
 * Meridian Conversion Analytics Service
 *
 * Version:
 * v2.3.0
 */

const crypto =
require("crypto");


const ConversionEvent =
require("../database/models/conversion-event-model");


async function record({
    userId,
    sessionId,
    eventType,
    trackingId = null,
    stage = "",
    intent = "unknown",
    asset = null,
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


module.exports = {
    record
};
