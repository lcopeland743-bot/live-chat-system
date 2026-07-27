/**
 * Meridian Session Service
 *
 * MongoDB Conversation Manager
 *
 * Version:
 * v2.4.1
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


const conversationCycleService =
require("./conversation-cycle-service");


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
    const existingSession =
        await Session.findOne(
            {
                userId:
                    data.userId
            }
        )
        .select({
            conversationId: 1,
            humanTakeover: 1,
            ipAddress: 1,
            geoLocation: 1
        })
        .lean();

    const cycleDecision =
        conversationCycleService
        .evaluate({
            existingSession,
            incomingConversationId:
                data.conversationId,
            allowReset:
                data.allowConversationReset
                === true
        });

    const time =
        data.time || new Date();

    const setValues = {
        userId: data.userId,
        customerId:
            data.customerId || null,
        socketId:
            data.socketId || null,
        status: "online",
        page:
            data.page || "",
        connectedAt:
            time,
        purgeAt:
            null
    };

    if (data.ipAddress) {
        setValues.ipAddress =
            data.ipAddress;
    }

    if (data.userAgent) {
        setValues.userAgent =
            data.userAgent;
    }

    if (
        data.ipAddress
        && existingSession
        && existingSession.ipAddress
        && existingSession.ipAddress
            !== data.ipAddress
    ) {
        setValues.geoLocation = {
            lookupStatus: "pending",
            updatedAt: time
        };
    }

    if (
        cycleDecision
        .effectiveConversationId
    ) {
        setValues.conversationId =
            cycleDecision
            .effectiveConversationId;
    }

    if (
        cycleDecision
        .resetConversionState
    ) {
        setValues.conversionState = {
            ...conversionStateService
                .createDefaultState(),
            humanTakeover:
                existingSession
                && existingSession
                    .humanTakeover
                === true,
            updatedAt:
                time
        };

        setValues.aiUpdatedAt =
            time;
    }

    const setOnInsertValues = {
        conversationStatus:
            "unassigned",
        aiMode:
            aiConfig.defaultMode,
        humanTakeover:
            false
    };

    if (
        !cycleDecision
        .resetConversionState
    ) {
        setOnInsertValues.aiUpdatedAt =
            new Date();

        setOnInsertValues.conversionState =
            conversionStateService
            .createDefaultState();
    }

    const session =
        await Session.findOneAndUpdate(
            {
                userId: data.userId
            },
            {
                $set: setValues,
                $setOnInsert:
                    setOnInsertValues
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert:
                    true
            }
        );

    if (
        cycleDecision
        .resetConversionState
    ) {
        console.log(
            "[Session] AI conversation cycle reset:",
            {
                userId:
                    data.userId,
                conversationId:
                    cycleDecision
                    .effectiveConversationId,
                reason:
                    cycleDecision.reason
            }
        );
    }

    return session;
}


async function updateGeoLocation(
    userId,
    ipAddress,
    geoLocation
) {
    if (
        !userId
        || !ipAddress
        || !geoLocation
        || geoLocation.success !== true
    ) {
        return null;
    }

    return await Session.findOneAndUpdate(
        {
            userId,
            ipAddress
        },
        {
            $set: {
                "geoLocation.country":
                    geoLocation.country || "",
                "geoLocation.countryCode":
                    geoLocation.countryCode || "",
                "geoLocation.region":
                    geoLocation.region || "",
                "geoLocation.regionCode":
                    geoLocation.regionCode || "",
                "geoLocation.city":
                    geoLocation.city || "",
                "geoLocation.timezone":
                    geoLocation.timezone || "",
                "geoLocation.timezoneAbbr":
                    geoLocation.timezoneAbbr || "",
                "geoLocation.locationLabel":
                    geoLocation.locationLabel || "",
                "geoLocation.provider":
                    geoLocation.provider || "",
                "geoLocation.lookupStatus":
                    "success",
                "geoLocation.updatedAt":
                    geoLocation.updatedAt
                    || new Date()
            }
        },
        {
            new: true
        }
    );
}


async function setActiveSocket(
    userId,
    socketId,
    time
) {
    return await Session.findOneAndUpdate(
        {
            userId
        },
        {
            $set: {
                socketId:
                    socketId || null,
                status:
                    "online",
                lastSeen:
                    time || new Date()
            }
        },
        {
            new: true
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
                            $limit: 25
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
                            $limit: 100
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
                            $limit: 100
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
    updateGeoLocation,
    setActiveSocket,
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
