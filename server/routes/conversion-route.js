/**
 * Meridian Public Conversion Routes
 *
 * Version:
 * v2.3.0
 */

const express =
require("express");


const router =
express.Router();


const {
    ADMIN_ROOM
}
=
require("../middleware/admin-socket-auth");


const sessionService =
require("../services/session-service");


const conversionAnalyticsService =
require("../services/conversion-analytics-service");


function safeIdentifier(value, maximum = 120) {
    const text =
        String(value || "").trim();

    if (
        !text
        || text.length > maximum
        || !/^[a-zA-Z0-9_.:-]+$/.test(text)
    ) {
        return "";
    }

    return text;
}


router.post(
    "/whatsapp-click",
    async (req, res) => {
        try {
            const userId =
                safeIdentifier(
                    req.body.userId,
                    120
                );

            const trackingId =
                safeIdentifier(
                    req.body.trackingId,
                    120
                );

            if (
                !userId
                || !trackingId
            ) {
                return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid conversion tracking payload"
                });
            }

            const session =
                await sessionService
                .markWhatsappClicked(
                    userId,
                    trackingId
                );

            if (!session) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Conversion event was already recorded or did not match"
                    });
            }

            await conversionAnalyticsService
                .record({
                    userId,
                    sessionId:
                        userId,
                    eventType:
                        "cta_clicked",
                    trackingId,
                    stage:
                        session.conversionState
                        .stage,
                    intent:
                        session.conversionState
                        .intent,
                    asset:
                        session.conversionState
                        .asset,
                    data: {
                        clickedAt:
                            new Date()
                            .toISOString()
                    }
                });

            const io =
                req.app.get("io");

            if (io) {
                io.to(ADMIN_ROOM)
                .emit(
                    "admin_session_update",
                    {
                        type: "update",
                        session
                    }
                );
            }

            return res.json({
                success: true
            });
        } catch (error) {
            console.error(
                "[WhatsApp Click Tracking Error]",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to record conversion click"
                });
        }
    }
);


module.exports =
router;
