/**
 * Meridian Admin AI Routes
 *
 * Version:
 * v2.3.0
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


const aiConfig =
require("../config/ai-config");


const aiConversationService =
require("../services/ai-conversation-service");


const sessionService =
require("../services/session-service");


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


router.get(
    "/status",
    (req, res) => {
        return res.json({
            success: true,
            ai:
                aiConversationService
                .getPublicStatus()
        });
    }
);


router.patch(
    "/sessions/:userId/mode",
    async (req, res) => {
        try {
            const mode =
                aiConfig.normalizeMode(
                    req.body.mode
                );

            if (mode !== req.body.mode) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid AI mode"
                    });
            }

            const session =
                await sessionService
                .setAiMode(
                    req.params.userId,
                    mode
                );

            if (!session) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Session not found"
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
        } catch (error) {
            console.error(
                "AI mode update error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to update AI mode"
                });
        }
    }
);


router.post(
    "/sessions/:userId/suggest",
    async (req, res) => {
        try {
            const session =
                await sessionService
                .getSessionByUserId(
                    req.params.userId
                );

            if (!session) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Session not found"
                    });
            }

            const generated =
                await aiConversationService
                .generateSuggestion(
                    req.params.userId
                );

            const payload = {
                userId:
                    req.params.userId,

                content:
                    generated.text,

                model:
                    generated.model,

                responseId:
                    generated.responseId,

                webSearchUsed:
                    generated.webSearchUsed
                    === true,

                searchedAt:
                    generated.searchedAt,

                sources:
                    generated.sources
                    || [],

                metadata: {
                    ...(
                        generated.metadata
                        || {}
                    ),
                    source:
                        "openai",
                    aiMode:
                        "assist"
                },

                conversion:
                    generated.metadata
                    ? generated.metadata
                        .conversion
                    : null,

                time:
                    new Date()
                    .toISOString()
            };

            const io =
                req.app.get("io");

            if (io) {
                io.to(ADMIN_ROOM)
                .emit(
                    "admin_ai_suggestion",
                    payload
                );
            }

            return res.json({
                success: true,
                suggestion:
                    payload
            });
        } catch (error) {
            console.error(
                "AI suggestion error:",
                error
            );

            return res
                .status(
                    error.status === 429
                    ? 429
                    : 502
                )
                .json({
                    success: false,
                    code:
                        error.code
                        || "AI_SUGGESTION_FAILED",
                    message:
                        error.message
                        || "AI suggestion failed"
                });
        }
    }
);


module.exports =
router;
