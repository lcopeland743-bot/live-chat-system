/**
 * Meridian Chat Handler
 *
 * Version:
 * v2.3.0
 *
 * Features:
 * - Rich messages
 * - MongoDB storage
 * - Investor profile replies
 * - GPT-5.6 Structured Conversion Engine
 * - OpenAI Web Search sources
 * - Dynamic WhatsApp Link Cards
 * - ASSIST / AUTO / Human Takeover
 */

const MeridianTime =
require("../utils/time");


const messageService =
require("../services/message-service");


const sessionService =
require("../services/session-service");


const briefingAutoReplyService =
require("../services/briefing-auto-reply-service");


const aiConversationService =
require("../services/ai-conversation-service");


const conversionAnalyticsService =
require("../services/conversion-analytics-service");


const {
    ADMIN_ROOM,
    verifyAdminSocketSession
}
=
require("../middleware/admin-socket-auth");


const activeChoiceUsers =
new Set();


function createMessageId() {
    return (
        "msg_"
        + Date.now()
        + "_"
        + Math.random()
            .toString(36)
            .substring(2, 8)
    );
}


function normalizeContent(data) {
    return (
        data.content
        || data.message
        || ""
    );
}


function normalizeType(data) {
    return data.type || "text";
}


function createPayload(
    data,
    defaults = {}
) {
    const content =
        normalizeContent(data);

    return {
        messageId:
            data.messageId
            || createMessageId(),

        userId:
            defaults.userId
            || data.userId,

        sessionId:
            defaults.sessionId
            || data.sessionId
            || data.userId,

        socketId:
            defaults.socketId
            || data.socketId
            || null,

        message:
            content,

        content,

        type:
            normalizeType(data),

        metadata:
            data.metadata || {},

        sender:
            defaults.sender
            || data.sender
            || "user",

        messageStatus:
            "sent",

        time:
            data.time
            || MeridianTime.now()
    };
}


function emitSessionUpdate(
    io,
    session
) {
    if (!session) {
        return;
    }

    io.to(ADMIN_ROOM)
    .emit(
        "admin_session_update",
        {
            type: "update",
            session
        }
    );
}


function emitAdminConversationMessage(
    io,
    payload
) {
    io.to(ADMIN_ROOM)
    .emit(
        "admin_user_message",
        payload
    );
}


function emitAiError(
    io,
    userId,
    error
) {
    io.to(ADMIN_ROOM)
    .emit(
        "admin_ai_error",
        {
            userId,
            code:
                error.code
                || "AI_REQUEST_FAILED",
            message:
                error.message
                || "AI could not generate a response.",
            time:
                MeridianTime.now()
        }
    );
}


async function saveAutomatedReply(
    io,
    targetSocketId,
    userId,
    message,
    sender = "admin"
) {
    const payload =
        createPayload(
            {
                type:
                    message.type,
                content:
                    message.content,
                message:
                    message.content,
                metadata:
                    message.metadata,
                time:
                    MeridianTime.now()
            },
            {
                userId,
                sessionId:
                    userId,
                socketId:
                    targetSocketId,
                sender
            }
        );

    await messageService
        .saveMessage(payload);

    const sessionPreview =
        payload.type === "link-card"
        ? (
            payload.metadata.title
            || "Decision signals"
        )
        : payload.content;

    const updatedSession =
        await sessionService
        .updateMessage(
            userId,
            sessionPreview,
            sender
        );

    emitSessionUpdate(
        io,
        updatedSession
    );

    io.to(targetSocketId)
    .emit(
        "admin_reply",
        payload
    );

    emitAdminConversationMessage(
        io,
        payload
    );

    console.log(
        "[Automated Reply Saved]",
        {
            messageId:
                payload.messageId,
            userId:
                payload.userId,
            sender:
                payload.sender,
            type:
                payload.type,
            source:
                payload.metadata.source
                || payload.metadata.choiceId
                || null
        }
    );

    return payload;
}


async function sendBriefingAutoReply(
    io,
    targetSocketId,
    userId,
    choiceId
) {
    const messages =
        briefingAutoReplyService
        .createAutoReplyMessages(
            choiceId
        );

    for (const message of messages) {
        await saveAutomatedReply(
            io,
            targetSocketId,
            userId,
            message,
            "admin"
        );
    }
}


async function processAiReply(
    io,
    socket,
    payload
) {
    try {
        const result =
            await aiConversationService
            .processUserMessage({
                payload
            });

        if (result.action === "none") {
            return;
        }

        const generated =
            result.generated;

        const latestSession =
            await sessionService
            .getSessionByUserId(
                payload.userId
            );

        if (
            !latestSession
            || latestSession.humanTakeover
                === true
        ) {
            return;
        }

        if (
            result.action === "suggestion"
            && latestSession.aiMode
                !== "assist"
        ) {
            return;
        }

        if (
            result.action === "reply"
            && latestSession.aiMode
                !== "auto"
        ) {
            return;
        }

        if (result.action === "suggestion") {
            io.to(ADMIN_ROOM)
            .emit(
                "admin_ai_suggestion",
                {
                    userId:
                        payload.userId,

                    sourceMessageId:
                        payload.messageId,

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
                        MeridianTime.now()
                }
            );

            return;
        }

        await saveAutomatedReply(
            io,
            socket.id,
            payload.userId,
            {
                type: "text",
                content:
                    generated.text,
                metadata: {
                    ...(
                        generated.metadata
                        || {}
                    ),
                    source:
                        "openai",
                    aiMode:
                        "auto"
                }
            },
            "ai"
        );

        if (generated.linkCard) {
            await saveAutomatedReply(
                io,
                socket.id,
                payload.userId,
                generated.linkCard,
                "ai"
            );
        }
    } catch (error) {
        console.error(
            "[AI Reply Error]",
            error
        );

        emitAiError(
            io,
            payload.userId,
            error
        );
    }
}


function registerChatHandler(
    io,
    socket
) {
    socket.on(
        "user_message",
        async data => {
            if (
                socket.data
                && socket.data.isAdmin === true
            ) {
                return;
            }

            let lockedChoiceUserId =
                null;

            try {
                const payload =
                    createPayload(
                        data,
                        {
                            userId:
                                data.userId,
                            sessionId:
                                data.userId,
                            socketId:
                                socket.id,
                            sender:
                                "user"
                        }
                    );

                if (
                    !payload.userId
                    || !payload.content
                ) {
                    return;
                }

                if (
                    messageService.isDuplicate(
                        payload.messageId
                    )
                ) {
                    return;
                }

                const choice =
                    briefingAutoReplyService
                    .getChoiceFromPayload(
                        payload
                    );

                if (choice) {
                    if (
                        activeChoiceUsers.has(
                            payload.userId
                        )
                    ) {
                        return;
                    }

                    activeChoiceUsers.add(
                        payload.userId
                    );

                    lockedChoiceUserId =
                        payload.userId;

                    const alreadySelected =
                        await messageService
                        .hasInvestorProfileChoice(
                            payload.userId
                        );

                    if (alreadySelected) {
                        return;
                    }
                }

                await messageService
                    .saveMessage(payload);

                await sessionService
                    .updateMessage(
                        payload.userId,
                        payload.content,
                        "user"
                    );

                const session =
                    await sessionService
                    .incrementUnread(
                        payload.userId
                    );

                console.log(
                    "[Message Saved]",
                    payload
                );

                emitSessionUpdate(
                    io,
                    session
                );

                emitAdminConversationMessage(
                    io,
                    payload
                );

                if (choice) {
                    await sendBriefingAutoReply(
                        io,
                        socket.id,
                        payload.userId,
                        choice.id
                    );

                    return;
                }

                processAiReply(
                    io,
                    socket,
                    payload
                );
            } catch (error) {
                console.error(
                    "[User Message Error]",
                    error
                );
            } finally {
                if (lockedChoiceUserId) {
                    activeChoiceUsers.delete(
                        lockedChoiceUserId
                    );
                }
            }
        }
    );


    socket.on(
        "admin_reply",
        async data => {
            try {
                const adminSessionValid =
                    await verifyAdminSocketSession(
                        socket
                    );

                if (!adminSessionValid) {
                    console.warn(
                        "[Unauthorized Admin Reply]",
                        socket.id
                    );

                    return;
                }

                if (
                    !data.socketId
                    || !(
                        data.message
                        || data.content
                    )
                ) {
                    return;
                }

                const sessions =
                    await sessionService
                    .getSessions();

                const session =
                    sessions.find(
                        item =>
                            item.socketId
                            === data.socketId
                    );

                if (!session) {
                    return;
                }

                const payload =
                    createPayload(
                        data,
                        {
                            userId:
                                session.userId,
                            sessionId:
                                session.userId,
                            socketId:
                                data.socketId,
                            sender:
                                "admin"
                        }
                    );

                if (
                    messageService.isDuplicate(
                        payload.messageId
                    )
                ) {
                    return;
                }

                await messageService
                    .saveMessage(payload);

                let updatedSession =
                    await sessionService
                    .updateMessage(
                        session.userId,
                        payload.content,
                        "admin"
                    );

                let committedSuggestion =
                    null;

                if (
                    payload.metadata
                    && payload.metadata.source
                        === "openai-assist"
                    && payload.metadata.responseId
                ) {
                    committedSuggestion =
                        await aiConversationService
                        .commitSuggestion({
                            userId:
                                session.userId,
                            responseId:
                                payload.metadata
                                .responseId,
                            content:
                                payload.content
                        });

                    if (
                        committedSuggestion
                        && committedSuggestion
                            .session
                    ) {
                        updatedSession =
                            committedSuggestion
                            .session;
                    }
                }

                if (
                    session.aiMode === "assist"
                    || session.aiMode === "auto"
                ) {
                    updatedSession =
                        await sessionService
                        .setHumanTakeover(
                            session.userId,
                            true
                        );

                    await conversionAnalyticsService
                        .record({
                            userId:
                                session.userId,
                            sessionId:
                                session.userId,
                            eventType:
                                "human_takeover",
                            stage:
                                updatedSession
                                .conversionState
                                .stage,
                            intent:
                                updatedSession
                                .conversionState
                                .intent,
                            asset:
                                updatedSession
                                .conversionState
                                .asset,
                            data: {
                                source:
                                    committedSuggestion
                                    ? "approved_ai_suggestion"
                                    : "manual_admin_reply"
                            }
                        });
                }

                emitSessionUpdate(
                    io,
                    updatedSession
                );

                console.log(
                    "Admin reply:",
                    payload
                );

                io.to(data.socketId)
                .emit(
                    "admin_reply",
                    payload
                );

                io.to(ADMIN_ROOM)
                .emit(
                    "admin_reply",
                    payload
                );

                if (
                    committedSuggestion
                    && committedSuggestion
                        .linkCard
                ) {
                    await saveAutomatedReply(
                        io,
                        data.socketId,
                        session.userId,
                        committedSuggestion
                            .linkCard,
                        "admin"
                    );
                }
            } catch (error) {
                console.error(
                    "[Admin Reply Error]",
                    error
                );
            }
        }
    );
}


module.exports =
registerChatHandler;
