/**
 * Meridian Admin WhatsApp Funnel Route
 *
 * Version:
 * v2.4.2
 */

const express =
require("express");


const router =
express.Router();


const {
    requireAdminApi
}
=
require("../middleware/admin-auth-middleware");


const adminFunnelService =
require("../services/admin-funnel-service");


const errorMonitorService =
require("../services/error-monitor-service");


router.use(
    requireAdminApi
);


router.get(
    "/",
    async (req, res) => {
        try {
            const result =
                await adminFunnelService
                .getFunnel(
                    req.query || {}
                );

            return res.json(
                result
            );
        }
        catch (error) {
            if (
                error
                && error.code
                    ===
                    "INVALID_FUNNEL_DATE_RANGE"
            ) {
                return res
                .status(400)
                .json({
                    success: false,
                    message:
                        error.message
                });
            }

            console.error(
                "Admin funnel analytics error:",
                error
            );

            errorMonitorService
            .captureError({
                source:
                    "admin.funnel_analytics",
                error,
                message:
                    "Admin funnel analytics failed.",
                code:
                    error.code
                    || "ADMIN_FUNNEL_ANALYTICS_FAILED",
                context: {
                    range:
                        req.query.range
                        || "30d",
                    language:
                        req.query.language
                        || "all",
                    aiMode:
                        req.query.aiMode
                        || "all",
                    hasAssetFilter:
                        Boolean(
                            req.query.asset
                        ),
                    hasIntentFilter:
                        Boolean(
                            req.query.intent
                        )
                }
            })
            .catch(() => {});

            return res
            .status(500)
            .json({
                success: false,
                message:
                    "Unable to load funnel analytics."
            });
        }
    }
);


module.exports =
router;
