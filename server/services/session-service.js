/**
 * Meridian Session Service
 *
 * MongoDB Conversation Manager
 *
 * Version:
 * v2.3.6
 */

const Session =
require("../database/models/session-model");


const aiConfig =
require("../config/ai-config");


const conversionConfig =
require("../config/conversion-config");


const conversionStateService =
require("./conversion-state-service");


const dataRetentionConfig =
require("../config/data-retention-config");


function buildConversionUpdate(state) {
    const normalized =
        conversionStateService
        .normalize(state);

    const update = {
        "conversionState.stage":
            normalized.stage,
        "conversionState.eligibleTurnCount":
            normalized.eligibleTurnCount,
        "conversionState.aiReplyCount":
            normalized.aiReplyCount,
        "conversionState.aiReplyLimitReached":
            normalized.aiReplyLimitReached,
        "conversionState.aiReplyLimitReachedAt":
            normalized.aiReplyLimitReachedAt,
        "conversionState.intent":
            normalized.intent,
        "conversionState.asset":
            normalized.asset,
        "conversionState.investmentHorizon":
            normalized.investmentHorizon,
        "conversionState.positionStatus":
            normalized.positionStatus,
        "conversionState.entryPlan":
            normalized.entryPlan,
        "conversionState.valueDelivered":
            normalized.valueDelivered,
        "conversionState.conversionSeedDelivered":
            normalized.conversionSeedDelivered,
        "conversionState.reservedValue":
            normalized.reservedValue,
        "conversionState.reservedValueType":
            normalized.reservedValueType,
        "conversionState.engagementScore":
            normalized.engagementScore,
        "conversionState.engagementSignal":
            normalized.engagementSignal,
        "conversionState.exitRisk":
            normalized.exitRisk,
        "conversionState.ctaShownCount":
            normalized.ctaShownCount,
        "conversionState.lastCtaTurn":
            normalized.lastCtaTurn,
        "conversionState.lastCtaTrackingId":
            normalized.lastCtaTrackingId,
        "conversionState.lastQuestionAsked":
            normalized.lastQuestionAsked,
        "conversionState.policyVersion":
            normalized.policyVersion,
        "conversionState.promptVersion":
            normalized.promptVersion,
        "conversionState.updatedAt":
            normalized.updatedAt
            || new Date()
    };

    if (normalized.doNotPush === true) {
        update["conversionState.doNotPush"] =
            true;
    }

    if (normalized.whatsappClicked === true) {
        update["conversionState.whatsappClicked"] =
            true;
    }

    return update;
}


async function createSession(data) {
    return await Session.findOneAndUpdate(
        {
            userId: data.userId
        },
        {
            $set: {
                userId: data.userId,
                customerId:
                    data.customerId || null,
                socketId:
                    data.socketId || null,
                status: "online",
                page:
                    data.page || "",
                connectedAt:
                    data.time || new Date(),
                purgeAt:
                    null
            },

            $setOnInsert: {
                conversationStatus:
                    "unassigned",
                aiMode:
                    aiConfig.defaultMode,
                humanTakeover:
                    false,
                conversionState:
                    conversionStateService
                    .createDefaultState()
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
}


async function updateMessage(
    userId,
    message,
    sender = "user"
) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            lastMessage: message,
            lastMessageAt:
                new Date(),
            lastSender: sender,
            purgeAt: null,

            $inc: {
                messageCount: 1
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
}


async function incrementUnread(userId) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            $inc: {
                unreadCount: 1
            }
        },
        {
            new: true
        }
    );
}


async function clearUnread(userId) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            unreadCount: 0
        },
        {
            new: true
        }
    );
}


async function setAiMode(
    userId,
    mode
) {
    const normalizedMode =
        aiConfig.normalizeMode(mode);

    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            aiMode:
                normalizedMode,
            humanTakeover:
                false,
            "conversionState.humanTakeover":
                false,
            aiUpdatedAt:
                new Date()
        },
        {
            new: true
        }
    );
}


async function setHumanTakeover(
    userId,
    enabled = true
) {
    const value =
        Boolean(enabled);

    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            humanTakeover:
                value,
            "conversionState.humanTakeover":
                value,
            "conversionState.updatedAt":
                new Date(),
            aiUpdatedAt:
                new Date()
        },
        {
            new: true
        }
    );
}


async function updateConversionState(
    userId,
    state
) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            $set:
                buildConversionUpdate(state)
        },
        {
            new: true
        }
    );
}


async function commitConversionStateIfAiActive(
    userId,
    state,
    expectedMode
) {
    const normalized =
        conversionStateService
        .normalize(state);

    if (
        normalized.aiReplyCount >=
        conversionConfig
        .maxAiRepliesPerSession
    ) {
        return null;
    }

    const nextReplyCount =
        normalized.aiReplyCount + 1;

    const limitReached =
        nextReplyCount >=
        conversionConfig
        .maxAiRepliesPerSession;

    const update =
        buildConversionUpdate({
            ...normalized,
            aiReplyCount:
                nextReplyCount,
            aiReplyLimitReached:
                limitReached,
            aiReplyLimitReachedAt:
                limitReached
                ? new Date()
                : null
        });

    return await Session.findOneAndUpdate(
        {
            userId,
            aiMode: expectedMode,
            humanTakeover: false,
            $or: [
                {
                    "conversionState.aiReplyCount": {
                        $lt:
                            conversionConfig
                            .maxAiRepliesPerSession
                    }
                },
                {
                    "conversionState.aiReplyCount": {
                        $exists: false
                    }
                }
            ]
        },
        {
            $set:
                update
        },
        {
            new: true
        }
    );
}


async function setConversionDoNotPush(
    userId,
    enabled = true
) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            $set: {
                "conversionState.doNotPush":
                    Boolean(enabled),
                "conversionState.updatedAt":
                    new Date()
            }
        },
        {
            new: true
        }
    );
}


async function markWhatsappClicked(
    userId,
    trackingId
) {
    return await Session.findOneAndUpdate(
        {
            userId,
            "conversionState.lastCtaTrackingId":
                trackingId,
            "conversionState.whatsappClicked":
                false
        },
        {
            "conversionState.whatsappClicked":
                true,
            "conversionState.updatedAt":
                new Date()
        },
        {
            new: true
        }
    );
}


async function assignAgent(
    userId,
    agentId,
    agentName = ""
) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            assignedAgentId:
                agentId,
            assignedAgentName:
                agentName,
            conversationStatus:
                "assigned"
        },
        {
            new: true
        }
    );
}


async function releaseAgent(userId) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            assignedAgentId:
                null,
            assignedAgentName:
                "",
            conversationStatus:
                "unassigned"
        },
        {
            new: true
        }
    );
}


async function getAgentSessions(agentId) {
    return await Session.find({
        assignedAgentId:
            agentId
    })
    .sort({
        updatedAt: -1
    });
}


async function offline(
    userId,
    time
) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            status:
                "offline",
            lastSeen:
                time || new Date()
        },
        {
            new: true
        }
    );
}


async function closeConversation(userId) {
    const closedAt =
        new Date();

    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            conversationStatus:
                "closed",
            aiMode:
                "off",
            humanTakeover:
                true,
            "conversionState.stage":
                "closed",
            "conversionState.humanTakeover":
                true,
            "conversionState.updatedAt":
                closedAt,
            aiUpdatedAt:
                closedAt,
            purgeAt:
                dataRetentionConfig
                .calculateClosedSessionPurgeAt(
                    closedAt
                )
        },
        {
            new: true
        }
    );
}


function normalizeVisitorStats(stats = {}) {
    return {
        totalVisitors:
            Math.max(
                0,
                Number(stats.totalVisitors) || 0
            ),
        activeConversations:
            Math.max(
                0,
                Number(stats.activeConversations) || 0
            ),
        silentVisitors:
            Math.max(
                0,
                Number(stats.silentVisitors) || 0
            ),
        onlineVisitors:
            Math.max(
                0,
                Number(stats.onlineVisitors) || 0
            ),
        onlineSilentVisitors:
            Math.max(
                0,
                Number(stats.onlineSilentVisitors) || 0
            )
    };
}


async function getAdminVisitorOverview() {
    const result =
        await Session.aggregate([
            {
                $addFields: {
                    _hasConversation: {
                        $or: [
                            {
                                $gt: [
                                    {
                                        $ifNull: [
                                            "$messageCount",
                                            0
                                        ]
                                    },
                                    0
                                ]
                            },
                            {
                                $ne: [
                                    {
                                        $ifNull: [
                                            "$lastMessageAt",
                                            null
                                        ]
                                    },
                                    null
                                ]
                            },
                            {
                                $gt: [
                                    {
                                        $strLenCP: {
                                            $trim: {
                                                input: {
                                                    $ifNull: [
                                                        "$lastMessage",
                                                        ""
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    0
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $facet: {
                    sessions: [
                        {
                            $match: {
                                _hasConversation: true
                            }
                        },
                        {
                            $sort: {
                                updatedAt: -1
                            }
                        },
                        {
                            $project: {
                                _hasConversation: 0
                            }
                        }
                    ],
                    onlineUsers: [
                        {
                            $match: {
                                status: "online"
                            }
                        },
                        {
                            $sort: {
                                updatedAt: -1
                            }
                        },
                        {
                            $project: {
                                _hasConversation: 0
                            }
                        }
                    ],
                    offlineUsers: [
                        {
                            $match: {
                                status: "offline",
                                _hasConversation: true
                            }
                        },
                        {
                            $sort: {
                                updatedAt: -1
                            }
                        },
                        {
                            $project: {
                                _hasConversation: 0
                            }
                        }
                    ],
                    stats: [
                        {
                            $group: {
                                _id: null,
                                totalVisitors: {
                                    $sum: 1
                                },
                                activeConversations: {
                                    $sum: {
                                        $cond: [
                                            "$_hasConversation",
                                            1,
                                            0
                                        ]
                                    }
                                },
                                silentVisitors: {
                                    $sum: {
                                        $cond: [
                                            "$_hasConversation",
                                            0,
                                            1
                                        ]
                                    }
                                },
                                onlineVisitors: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $eq: [
                                                    "$status",
                                                    "online"
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                onlineSilentVisitors: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            "$status",
                                                            "online"
                                                        ]
                                                    },
                                                    {
                                                        $eq: [
                                                            "$_hasConversation",
                                                            false
                                                        ]
                                                    }
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0
                            }
                        }
                    ]
                }
            }
        ]);

    const overview =
        result[0]
        ||
        {};

    return {
        sessions:
            overview.sessions
            ||
            [],
        onlineUsers:
            overview.onlineUsers
            ||
            [],
        offlineUsers:
            overview.offlineUsers
            ||
            [],
        visitorStats:
            normalizeVisitorStats(
                overview.stats
                &&
                overview.stats[0]
            )
    };
}


async function getSessions() {
    return await Session.find()
    .sort({
        updatedAt: -1
    });
}


async function getSessionByUserId(userId) {
    return await Session.findOne({
        userId
    });
}


module.exports = {
    createSession,
    updateMessage,
    incrementUnread,
    clearUnread,
    setAiMode,
    setHumanTakeover,
    updateConversionState,
    commitConversionStateIfAiActive,
    setConversionDoNotPush,
    markWhatsappClicked,
    assignAgent,
    releaseAgent,
    getAgentSessions,
    offline,
    closeConversation,
    getAdminVisitorOverview,
    getSessions,
    getSessionByUserId
};
