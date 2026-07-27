/**
 * Meridian Admin Session Management Route
 *
 * Search, filters, pagination, labels, and lead intent.
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


const {
    ADMIN_ROOM
}
=
require("../middleware/admin-socket-auth");


const adminSessionQueryService =
require("../services/admin-session-query-service");


const conversionAnalyticsService =
require("../services/conversion-analytics-service");


const errorMonitorService =
require("../services/error-monitor-service");


router.use(
    requireAdminApi
);


function emitSessionUpdate(
    req,
    session
) {
    const io =
        req.app.get("io");

    if (
        io
        && session
    ) {
        io.to(ADMIN_ROOM)
        .emit(
            "admin_session_update",
            {
                type: "update",
                session
            }
        );
    }
}


function isValidationError(error) {
    return Boolean(
        error
        && [
            "INVALID_TAGS",
            "INVALID_TAG_LENGTH",
            "INVALID_TAG_CHARACTERS",
            "TOO_MANY_TAGS",
            "INVALID_PRIORITY",
            "INVALID_FOLLOW_UP_STATUS",
            "EMPTY_LABEL_UPDATE"
        ]
        .includes(error.code)
    );
}


router.get(
    "/",
    async (req, res) => {
        try {
            const result =
                await adminSessionQueryService
                .listSessions(req.query);

            return res.json({
                success: true,
                ...result
            });
        }
        catch (error) {
            console.error(
                "Admin session query error:",
                error
            );

            errorMonitorService
            .captureError({
                source:
                    "admin.session_query",
                error,
                message:
                    "Admin session query failed.",
                code:
                    error.code
                    || "ADMIN_SESSION_QUERY_FAILED",
                context: {
                    status:
                        req.query.status
                        || "all",
                    aiMode:
                        req.query.aiMode
                        || "all",
                    intentLevel:
                        req.query.intentLevel
                        || "all",
                    whatsapp:
                        req.query.whatsapp
                        || "all",
                    followUpStatus:
                        req.query.followUpStatus
                        || "all",
                    hasSearch:
                        Boolean(req.query.q),
                    hasTagFilter:
                        Boolean(req.query.tag)
                }
            })
            .catch(() => {});

            return res
            .status(500)
            .json({
                success: false,
                message:
                    "Unable to load conversations."
            });
        }
    }
);


router.get(
    "/:userId",
    async (req, res) => {
        try {
            const session =
                await adminSessionQueryService
                .getSession(
                    req.params.userId
                );

            if (!session) {
                return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Session not found."
                });
            }

            return res.json({
                success: true,
                session
            });
        }
        catch (error) {
            console.error(
                "Admin session read error:",
                error
            );

            errorMonitorService
            .captureError({
                source:
                    "admin.session_read",
                error,
                message:
                    "Admin session read failed.",
                code:
                    error.code
                    || "ADMIN_SESSION_READ_FAILED",
                context: {
                    userId:
                        req.params.userId
                }
            })
            .catch(() => {});

            return res
            .status(500)
            .json({
                success: false,
                message:
                    "Unable to load the conversation."
            });
        }
    }
);


router.patch(
    "/:userId/labels",
    async (req, res) => {
        try {
            const session =
                await adminSessionQueryService
                .updateLabels(
                    req.params.userId,
                    req.body || {}
                );

            if (!session) {
                return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Session not found."
                });
            }

            emitSessionUpdate(
                req,
                session
            );

            return res.json({
                success: true,
                session
            });
        }
        catch (error) {
            if (isValidationError(error)) {
                return res
                .status(400)
                .json({
                    success: false,
                    message:
                        error.message
                });
            }

            console.error(
                "Admin session label update error:",
                error
            );

            errorMonitorService
            .captureError({
                source:
                    "admin.session_label_update",
                error,
                message:
                    "Admin session label update failed.",
                code:
                    error.code
                    || "ADMIN_SESSION_LABEL_UPDATE_FAILED",
                context: {
                    userId:
                        req.params.userId
                }
            })
            .catch(() => {});

            return res
            .status(500)
            .json({
                success: false,
                message:
                    "Unable to update labels."
            });
        }
    }
);


router.patch(
    "/:userId/follow-up",
    async (req, res) => {
        try {
            const result =
                await adminSessionQueryService
                .updateFollowUp(
                    req.params.userId,
                    {
                        status:
                            req.body
                            && req.body.status,
                        updatedBy:
                            req.session
                            && req.session
                                .adminUsername
                            ? req.session
                                .adminUsername
                            : "admin"
                    }
                );

            if (
                !result
                || !result.session
            ) {
                return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Session not found."
                });
            }

            const latestContext =
                await conversionAnalyticsService
                .findLatestContext(
                    result.session.userId
                );

            await conversionAnalyticsService
                .record({
                    userId:
                        result.session.userId,
                    sessionId:
                        result.session.userId,
                    eventType:
                        "follow_up_updated",
                    stage:
                        result.session
                        .conversionState
                        .stage,
                    intent:
                        result.session
                        .conversionState
                        .intent,
                    asset:
                        result.session
                        .conversionState
                        .asset,
                    language:
                        latestContext
                        && latestContext.language,
                    aiMode:
                        result.session.aiMode
                        || (
                            latestContext
                            && latestContext.aiMode
                        ),
                    data: {
                        previousStatus:
                            result.previousStatus,
                        status:
                            result.session
                            .followUpStatus,
                        updatedAt:
                            result.updatedAt
                            .toISOString()
                    }
                });

            emitSessionUpdate(
                req,
                result.session
            );

            return res.json({
                success: true,
                session:
                    result.session
            });
        }
        catch (error) {
            if (isValidationError(error)) {
                return res
                .status(400)
                .json({
                    success: false,
                    message:
                        error.message
                });
            }

            console.error(
                "Admin follow-up update error:",
                error
            );

            errorMonitorService
            .captureError({
                source:
                    "admin.follow_up_update",
                error,
                message:
                    "Admin follow-up update failed.",
                code:
                    error.code
                    || "ADMIN_FOLLOW_UP_UPDATE_FAILED",
                context: {
                    userId:
                        req.params.userId
                }
            })
            .catch(() => {});

            return res
            .status(500)
            .json({
                success: false,
                message:
                    "Unable to update follow-up status."
            });
        }
    }
);


module.exports =
router;
