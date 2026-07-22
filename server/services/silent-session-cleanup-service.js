/**
 * Meridian Silent Session Cleanup Service
 *
 * Version:
 * v2.3.11
 *
 * Safety rules:
 * - Only offline, unassigned sessions are eligible.
 * - Any user, admin, or AI message protects the session.
 * - Recent reconnects or session updates protect the session.
 * - MongoDB re-evaluates the complete filter atomically at deletion time.
 */

const Session =
require("../database/models/session-model");


const config =
require("../config/data-retention-config");


const EPOCH =
new Date(0);


function normalizeDate(value) {
    if (!value) {
        return null;
    }

    const date =
        value instanceof Date
        ? value
        : new Date(value);

    return Number.isNaN(
        date.getTime()
    )
    ? null
    : date;
}


function getLatestActivityAt(
    session = {}
) {
    const candidates = [
        session.lastSeen,
        session.connectedAt,
        session.updatedAt,
        session.createdAt
    ]
    .map(normalizeDate)
    .filter(Boolean);

    if (candidates.length === 0) {
        return null;
    }

    return new Date(
        Math.max(
            ...candidates.map(
                date => date.getTime()
            )
        )
    );
}


function isSilentSessionEligible(
    session,
    cutoff
) {
    const normalizedCutoff =
        normalizeDate(cutoff);

    if (
        !session
        || !normalizedCutoff
        || session.status !== "offline"
        || session.conversationStatus !==
            "unassigned"
    ) {
        return false;
    }

    const messageCount =
        Number(
            session.messageCount
            || 0
        );

    if (messageCount > 0) {
        return false;
    }

    if (normalizeDate(session.lastMessageAt)) {
        return false;
    }

    if (
        String(
            session.lastMessage
            || ""
        )
        .trim()
    ) {
        return false;
    }

    const latestActivityAt =
        getLatestActivityAt(session);

    return Boolean(
        latestActivityAt
        && latestActivityAt <=
            normalizedCutoff
    );
}


function createLatestActivityExpression() {
    return {
        $max: [
            {
                $ifNull: [
                    "$lastSeen",
                    EPOCH
                ]
            },
            {
                $ifNull: [
                    "$connectedAt",
                    EPOCH
                ]
            },
            {
                $ifNull: [
                    "$updatedAt",
                    EPOCH
                ]
            },
            {
                $ifNull: [
                    "$createdAt",
                    EPOCH
                ]
            }
        ]
    };
}


function buildSilentSessionFilter(
    cutoff
) {
    const normalizedCutoff =
        normalizeDate(cutoff);

    if (!normalizedCutoff) {
        return null;
    }

    return {
        status:
            "offline",
        conversationStatus:
            "unassigned",
        $and: [
            {
                $or: [
                    {
                        messageCount: {
                            $exists: false
                        }
                    },
                    {
                        messageCount:
                            null
                    },
                    {
                        messageCount: {
                            $lte: 0
                        }
                    }
                ]
            },
            {
                $or: [
                    {
                        lastMessageAt: {
                            $exists: false
                        }
                    },
                    {
                        lastMessageAt:
                            null
                    }
                ]
            },
            {
                $or: [
                    {
                        lastMessage: {
                            $exists: false
                        }
                    },
                    {
                        lastMessage:
                            null
                    },
                    {
                        lastMessage:
                            ""
                    },
                    {
                        lastMessage: {
                            $type:
                                "string",
                            $regex:
                                /^\s*$/
                        }
                    }
                ]
            },
            {
                $expr: {
                    $lte: [
                        createLatestActivityExpression(),
                        normalizedCutoff
                    ]
                }
            }
        ]
    };
}


function getCutoff(
    now = new Date()
) {
    return config
    .calculateSilentSessionCutoff(now);
}


async function countReadyForDeletion(
    now = new Date()
) {
    const cutoff =
        getCutoff(now);

    const filter =
        buildSilentSessionFilter(cutoff);

    if (!filter) {
        return 0;
    }

    return await Session
    .countDocuments(filter);
}


async function cleanupExpired(
    now = new Date()
) {
    const cutoff =
        getCutoff(now);

    const filter =
        buildSilentSessionFilter(cutoff);

    if (!filter) {
        return {
            enabled: false,
            cutoff: null,
            deleted: 0
        };
    }

    const result =
        await Session.deleteMany(
            filter
        );

    return {
        enabled: true,
        cutoff:
            cutoff.toISOString(),
        deleted:
            result.deletedCount
            || 0
    };
}


module.exports = {
    getLatestActivityAt,
    isSilentSessionEligible,
    buildSilentSessionFilter,
    countReadyForDeletion,
    cleanupExpired
};
