/**
 * Meridian Admin Error Monitoring Routes
 *
 * Version:
 * v2.3.10
 */

const express =
require("express");


const router =
express.Router();


const {
    requireAdminApi,
    setNoStore
}
=
require("../middleware/admin-auth-middleware");


const errorMonitorService =
require("../services/error-monitor-service");


router.use(
    requireAdminApi,
    setNoStore
);


router.get(
    "/",
    async (req, res, next) => {
        try {
            const result =
                await errorMonitorService
                .list({
                    limit:
                        req.query.limit,
                    level:
                        req.query.level,
                    resolved:
                        req.query.resolved,
                    source:
                        req.query.source
                });

            return res.json({
                success: true,
                status:
                    errorMonitorService
                    .getStatus(),
                ...result
            });
        } catch (error) {
            error.code =
                error.code
                || "ERROR_MONITOR_LIST_FAILED";
            return next(error);
        }
    }
);


router.patch(
    "/:eventId/resolve",
    async (req, res, next) => {
        try {
            const event =
                await errorMonitorService
                .resolveEvent(
                    req.params.eventId
                );

            if (!event) {
                return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Error event not found"
                });
            }

            return res.json({
                success: true,
                event
            });
        } catch (error) {
            error.code =
                error.code
                || "ERROR_MONITOR_RESOLVE_FAILED";
            return next(error);
        }
    }
);


router.post(
    "/resolve-all",
    async (req, res, next) => {
        try {
            const result =
                await errorMonitorService
                .resolveAll();

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            error.code =
                error.code
                || "ERROR_MONITOR_RESOLVE_ALL_FAILED";
            return next(error);
        }
    }
);


module.exports =
router;
