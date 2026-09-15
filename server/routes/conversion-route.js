/**
 * Meridian Public Conversion Routes
 *
 * Version:
 * v2.4.2
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


const {
    serializeAdminSession
}
=
require("../services/source-attribution-service");


const conversionAnalyticsService =
require("../services/conversion-analytics-service");


const whatsappSettingsService =
require("../services/whatsapp-settings-service");


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


router.get(
    "/whatsapp-status",
    async (req, res) => {
        try {
            const routeKey = whatsappSettingsService
                .normalizeRouteKey(req.query.routeKey);

            const settings = await whatsappSettingsService
                .getResolvedSettings({ routeKey });

            res.set(
                "Cache-Control",
                "no-store, no-cache, must-revalidate, private"
            );

            return res.json({
                success: true,
                enabled:
                    settings.enabled === true
                    && Boolean(settings.number),
                routeKey:
                    settings.routeKey || routeKey || "",
                resolutionSource:
                    settings.resolutionSource || settings.source || "",
                numberId:
                    settings.numberId || ""
            });
        } catch (error) {
            console.error(
                "[WhatsApp Status Error]",
                error
            );

            return res.status(503).json({
                success: false,
                enabled: false
            });
        }
    }
);


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

            const ctaContext =
                await conversionAnalyticsService
                .findCtaContext(
                    userId,
                    trackingId
                );

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
                    language:
                        ctaContext
                        && ctaContext.language,
                    aiMode:
                        session.aiMode
                        || (
                            ctaContext
                            && ctaContext.aiMode
                        ),
                    data: {
                        clickedAt:
                            new Date()
                            .toISOString(),
                        routeKey:
                            ctaContext
                            && ctaContext.data
                            && ctaContext.data.routeKey
                            ? ctaContext.data.routeKey
                            : "",
                        numberId:
                            ctaContext
                            && ctaContext.data
                            && ctaContext.data.numberId
                            ? ctaContext.data.numberId
                            : "",
                        pageId:
                            ctaContext
                            && ctaContext.data
                            && ctaContext.data.pageId
                            ? ctaContext.data.pageId
                            : "",
                        campaignId:
                            ctaContext
                            && ctaContext.data
                            && ctaContext.data.campaignId
                            ? ctaContext.data.campaignId
                            : ""
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
                        session:
                            serializeAdminSession(
                                session
                            )
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
