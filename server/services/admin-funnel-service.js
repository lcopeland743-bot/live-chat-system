/**
 * Meridian Admin WhatsApp Funnel Service
 *
 * Aggregates unique-session conversion stages without requiring
 * the WhatsApp Cloud API. WhatsApp join and conversion outcomes
 * are maintained by administrators through follow-up status.
 *
 * Version:
 * v2.4.2
 */

const ConversionEvent =
require("../database/models/conversion-event-model");


const Session =
require("../database/models/session-model");


const adminSessionQueryService =
require("./admin-session-query-service");


const FUNNEL_EVENT_TYPES = [
    "user_turn",
    "value_delivered",
    "cta_shown",
    "cta_clicked",
    "human_takeover",
    "follow_up_updated"
];


const ALLOWED_RANGES =
new Set([
    "today",
    "7d",
    "30d",
    "90d",
    "all",
    "custom"
]);


const ALLOWED_LANGUAGES =
new Set([
    "all",
    "en",
    "zh",
    "other",
    "unknown"
]);


const ALLOWED_AI_MODES =
new Set([
    "all",
    "auto",
    "assist",
    "off",
    "unknown"
]);


const ALLOWED_LEAD_LEVELS =
new Set([
    "all",
    "high",
    "medium",
    "low"
]);


const ALLOWED_FOLLOW_UP_STATUSES =
adminSessionQueryService
.ALLOWED_FOLLOW_UP_STATUSES;


const FOLLOW_UP_STATUS_ORDER = {
    not_followed_up: 0,
    contacted: 1,
    joined_whatsapp: 2,
    converted: 3,
    invalid: -1
};


function normalizeEnum(
    value,
    allowed,
    fallback
) {
    const normalized =
        String(value || fallback)
        .trim()
        .toLowerCase();

    return allowed.has(normalized)
        ? normalized
        : fallback;
}


function normalizeDimension(
    value,
    maximum = 60
) {
    return String(value || "")
    .trim()
    .slice(0, maximum);
}


function escapeRegex(value) {
    return String(value || "")
    .replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


function parseDateOnly(
    value,
    addDay = false
) {
    const text =
        String(value || "")
        .trim();

    if (
        !/^\d{4}-\d{2}-\d{2}$/
        .test(text)
    ) {
        return null;
    }

    const date =
        new Date(
            `${text}T00:00:00.000Z`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    if (addDay) {
        date.setUTCDate(
            date.getUTCDate() + 1
        );
    }

    return date;
}


function resolveDateRange(
    input = {},
    now = new Date()
) {
    const range =
        normalizeEnum(
            input.range,
            ALLOWED_RANGES,
            "30d"
        );

    if (range === "all") {
        return {
            range,
            start: null,
            endExclusive: null
        };
    }

    if (range === "custom") {
        const start =
            parseDateOnly(
                input.start
            );

        const endExclusive =
            parseDateOnly(
                input.end,
                true
            );

        if (
            start
            && endExclusive
            && start < endExclusive
        ) {
            return {
                range,
                start,
                endExclusive
            };
        }

        const error =
            new Error(
                "Custom date range is invalid."
            );

        error.code =
            "INVALID_FUNNEL_DATE_RANGE";

        throw error;
    }

    const endExclusive =
        new Date(now);

    if (range === "today") {
        const start =
            new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate()
                )
            );

        return {
            range,
            start,
            endExclusive
        };
    }

    const days =
        range === "7d"
        ? 7
        : range === "90d"
        ? 90
        : 30;

    const start =
        new Date(
            endExclusive.getTime()
            - days * 24 * 60 * 60 * 1000
        );

    return {
        range,
        start,
        endExclusive
    };
}


function normalizeOptions(
    input = {},
    now = new Date()
) {
    const dateRange =
        resolveDateRange(
            input,
            now
        );

    return {
        ...dateRange,
        language:
            normalizeEnum(
                input.language,
                ALLOWED_LANGUAGES,
                "all"
            ),
        aiMode:
            normalizeEnum(
                input.aiMode,
                ALLOWED_AI_MODES,
                "all"
            ),
        leadLevel:
            normalizeEnum(
                input.leadLevel,
                ALLOWED_LEAD_LEVELS,
                "all"
            ),
        followUpStatus:
            normalizeEnum(
                input.followUpStatus,
                ALLOWED_FOLLOW_UP_STATUSES,
                "all"
            ),
        asset:
            normalizeDimension(
                input.asset,
                30
            ),
        intent:
            normalizeDimension(
                input.intent,
                60
            )
    };
}


function buildUnknownMatch(field) {
    return {
        $or: [
            {
                [field]:
                    "unknown"
            },
            {
                [field]:
                    ""
            },
            {
                [field]:
                    null
            },
            {
                [field]: {
                    $exists: false
                }
            }
        ]
    };
}


function buildEventMatch(options) {
    const clauses = [
        {
            eventType: {
                $in:
                    FUNNEL_EVENT_TYPES
            }
        }
    ];

    if (
        options.start
        || options.endExclusive
    ) {
        const createdAt = {};

        if (options.start) {
            createdAt.$gte =
                options.start;
        }

        if (options.endExclusive) {
            createdAt.$lt =
                options.endExclusive;
        }

        clauses.push({
            createdAt
        });
    }

    if (options.language !== "all") {
        if (options.language === "unknown") {
            clauses.push(
                buildUnknownMatch(
                    "language"
                )
            );
        }
        else {
            clauses.push({
                language:
                    options.language
            });
        }
    }

    if (options.aiMode !== "all") {
        if (options.aiMode === "unknown") {
            clauses.push(
                buildUnknownMatch(
                    "aiMode"
                )
            );
        }
        else {
            clauses.push({
                aiMode:
                    options.aiMode
            });
        }
    }

    if (options.asset) {
        clauses.push({
            asset: {
                $regex:
                    escapeRegex(
                        options.asset
                    ),
                $options:
                    "i"
            }
        });
    }

    if (options.intent) {
        clauses.push({
            intent: {
                $regex:
                    escapeRegex(
                        options.intent
                    ),
                $options:
                    "i"
            }
        });
    }

    return clauses.length === 1
        ? clauses[0]
        : {
            $and:
                clauses
        };
}


function eventFlag(eventType) {
    return {
        $max: {
            $cond: [
                {
                    $eq: [
                        "$eventType",
                        eventType
                    ]
                },
                1,
                0
            ]
        }
    };
}


function followUpFlag(statuses) {
    return {
        $max: {
            $cond: [
                {
                    $and: [
                        {
                            $eq: [
                                "$eventType",
                                "follow_up_updated"
                            ]
                        },
                        {
                            $in: [
                                "$data.status",
                                statuses
                            ]
                        }
                    ]
                },
                1,
                0
            ]
        }
    };
}


function buildUserPipeline(options) {
    return [
        {
            $match:
                buildEventMatch(options)
        },
        {
            $sort: {
                createdAt: 1,
                _id: 1
            }
        },
        {
            $group: {
                _id:
                    "$userId",
                hasConversation:
                    eventFlag(
                        "user_turn"
                    ),
                hasValue:
                    eventFlag(
                        "value_delivered"
                    ),
                hasCtaShown:
                    eventFlag(
                        "cta_shown"
                    ),
                hasCtaClicked:
                    eventFlag(
                        "cta_clicked"
                    ),
                hasHumanTakeover:
                    eventFlag(
                        "human_takeover"
                    ),
                hasFollowUpContacted:
                    followUpFlag([
                        "contacted",
                        "joined_whatsapp",
                        "converted"
                    ]),
                hasJoinedWhatsapp:
                    followUpFlag([
                        "joined_whatsapp",
                        "converted"
                    ]),
                hasConverted:
                    followUpFlag([
                        "converted"
                    ]),
                latestAsset: {
                    $last:
                        "$asset"
                },
                latestIntent: {
                    $last:
                        "$intent"
                },
                latestLanguage: {
                    $last:
                        "$language"
                },
                latestAiMode: {
                    $last:
                        "$aiMode"
                },
                firstEventAt: {
                    $min:
                        "$createdAt"
                },
                lastEventAt: {
                    $max:
                        "$createdAt"
                }
            }
        }
    ];
}


function buildDailyPipeline(options) {
    return [
        {
            $match:
                buildEventMatch(options)
        },
        {
            $match: {
                eventType: {
                    $in: [
                        "user_turn",
                        "value_delivered",
                        "cta_shown",
                        "cta_clicked"
                    ]
                }
            }
        },
        {
            $group: {
                _id: {
                    day: {
                        $dateToString: {
                            format:
                                "%Y-%m-%d",
                            date:
                                "$createdAt",
                            timezone:
                                "UTC"
                        }
                    },
                    eventType:
                        "$eventType",
                    userId:
                        "$userId"
                }
            }
        },
        {
            $group: {
                _id: {
                    day:
                        "$_id.day",
                    eventType:
                        "$_id.eventType"
                },
                count: {
                    $sum: 1
                }
            }
        },
        {
            $sort: {
                "_id.day": 1,
                "_id.eventType": 1
            }
        }
    ];
}


async function executeSessionFind(
    userIds
) {
    if (!userIds.length) {
        return [];
    }

    let request =
        Session.find({
            userId: {
                $in:
                    userIds
            }
        });

    if (
        request
        && typeof request.select
            === "function"
    ) {
        request =
            request.select({
                userId: 1,
                followUpStatus: 1,
                followUpUpdatedAt: 1,
                priority: 1,
                tags: 1,
                aiMode: 1,
                conversionState: 1
            });
    }

    if (
        request
        && typeof request.lean
            === "function"
    ) {
        request =
            request.lean();
    }

    return await request;
}


function normalizeFollowUpStatus(value) {
    const status =
        String(value || "")
        .trim()
        .toLowerCase();

    return (
        ALLOWED_FOLLOW_UP_STATUSES
        .has(status)
        && status !== "all"
    )
        ? status
        : "not_followed_up";
}


function isDateWithinRange(
    value,
    options
) {
    if (!value) {
        return false;
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return false;
    }

    if (
        options.start
        && date < options.start
    ) {
        return false;
    }

    if (
        options.endExclusive
        && date >= options.endExclusive
    ) {
        return false;
    }

    return true;
}


function roundRate(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.round(
        value * 10
    ) / 10;
}


function calculateRate(
    count,
    denominator
) {
    if (!denominator) {
        return 0;
    }

    return roundRate(
        count / denominator * 100
    );
}


function incrementMap(
    map,
    value
) {
    const key =
        String(value || "")
        .trim();

    if (
        !key
        || key.toLowerCase()
            === "unknown"
    ) {
        return;
    }

    map.set(
        key,
        (
            map.get(key)
            || 0
        ) + 1
    );
}


function mapTopValues(
    values,
    limit = 8
) {
    return Array.from(
        values.entries()
    )
    .sort((a, b) =>
        b[1] - a[1]
        || a[0].localeCompare(b[0])
    )
    .slice(0, limit)
    .map(([name, count]) => ({
        name,
        count
    }));
}


function normalizeDailyRows(rows) {
    const byDay =
        new Map();

    for (const row of rows || []) {
        const day =
            row
            && row._id
            && row._id.day;

        const eventType =
            row
            && row._id
            && row._id.eventType;

        if (
            !day
            || !eventType
        ) {
            continue;
        }

        if (!byDay.has(day)) {
            byDay.set(day, {
                day,
                conversations: 0,
                valueDelivered: 0,
                ctaShown: 0,
                ctaClicked: 0
            });
        }

        const target =
            byDay.get(day);

        const count =
            Math.max(
                0,
                Number(row.count)
                || 0
            );

        if (eventType === "user_turn") {
            target.conversations =
                count;
        }
        else if (
            eventType ===
            "value_delivered"
        ) {
            target.valueDelivered =
                count;
        }
        else if (
            eventType ===
            "cta_shown"
        ) {
            target.ctaShown =
                count;
        }
        else if (
            eventType ===
            "cta_clicked"
        ) {
            target.ctaClicked =
                count;
        }
    }

    return Array.from(
        byDay.values()
    )
    .sort((a, b) =>
        a.day.localeCompare(b.day)
    );
}


function serializeFilters(options) {
    return {
        range:
            options.range,
        start:
            options.start
            ? options.start
                .toISOString()
            : null,
        endExclusive:
            options.endExclusive
            ? options.endExclusive
                .toISOString()
            : null,
        language:
            options.language,
        aiMode:
            options.aiMode,
        leadLevel:
            options.leadLevel,
        followUpStatus:
            options.followUpStatus,
        asset:
            options.asset,
        intent:
            options.intent
    };
}


async function getFunnel(
    input = {},
    now = new Date()
) {
    const options =
        normalizeOptions(
            input,
            now
        );

    const [
        rows,
        dailyRows
    ] =
    await Promise.all([
        ConversionEvent.aggregate(
            buildUserPipeline(options)
        ),
        ConversionEvent.aggregate(
            buildDailyPipeline(options)
        )
    ]);

    const userIds =
        (rows || [])
        .map(row =>
            String(
                row
                && row._id
                || ""
            )
            .trim()
        )
        .filter(Boolean);

    const sessions =
        await executeSessionFind(
            userIds
        );

    const sessionByUserId =
        new Map(
            (sessions || [])
            .map(session => [
                String(
                    session.userId
                    || ""
                ),
                session
            ])
        );

    const counts = {
        conversations: 0,
        valueDelivered: 0,
        ctaShown: 0,
        ctaClicked: 0,
        contacted: 0,
        joinedWhatsapp: 0,
        converted: 0
    };

    const followUpSummary = {
        not_followed_up: 0,
        contacted: 0,
        joined_whatsapp: 0,
        converted: 0,
        invalid: 0
    };

    const assetCounts =
        new Map();

    const intentCounts =
        new Map();

    let unknownLanguageUsers = 0;
    let unknownAiModeUsers = 0;

    for (const row of rows || []) {
        const userId =
            String(
                row
                && row._id
                || ""
            )
            .trim();

        if (!userId) {
            continue;
        }

        const session =
            sessionByUserId.get(userId)
            || {
                userId,
                conversionState: {}
            };

        const lead =
            adminSessionQueryService
            .deriveLeadProfile(session);

        const followUpStatus =
            normalizeFollowUpStatus(
                session.followUpStatus
            );

        if (
            options.leadLevel !== "all"
            && lead.level !==
                options.leadLevel
        ) {
            continue;
        }

        if (
            options.followUpStatus
            !== "all"
            && followUpStatus !==
                options.followUpStatus
        ) {
            continue;
        }

        const conversation =
            Number(
                row.hasConversation
            ) > 0;

        if (!conversation) {
            continue;
        }

        const valueDelivered =
            conversation
            && Number(
                row.hasValue
            ) > 0;

        const ctaShown =
            valueDelivered
            && Number(
                row.hasCtaShown
            ) > 0;

        const ctaClicked =
            ctaShown
            && Number(
                row.hasCtaClicked
            ) > 0;

        const currentStatusInRange =
            isDateWithinRange(
                session.followUpUpdatedAt,
                options
            );

        const statusRank =
            currentStatusInRange
            ? (
                FOLLOW_UP_STATUS_ORDER[
                    followUpStatus
                ]
                || 0
            )
            : 0;

        const contactedSignal =
            Number(
                row.hasHumanTakeover
            ) > 0
            || Number(
                row.hasFollowUpContacted
            ) > 0
            || statusRank >= 1;

        const joinedSignal =
            Number(
                row.hasJoinedWhatsapp
            ) > 0
            || statusRank >= 2;

        const convertedSignal =
            Number(
                row.hasConverted
            ) > 0
            || statusRank >= 3;

        const contacted =
            ctaClicked
            && contactedSignal;

        const joinedWhatsapp =
            contacted
            && joinedSignal;

        const converted =
            joinedWhatsapp
            && convertedSignal;

        counts.conversations += 1;

        if (valueDelivered) {
            counts.valueDelivered += 1;
        }

        if (ctaShown) {
            counts.ctaShown += 1;
        }

        if (ctaClicked) {
            counts.ctaClicked += 1;
        }

        if (contacted) {
            counts.contacted += 1;
        }

        if (joinedWhatsapp) {
            counts.joinedWhatsapp += 1;
        }

        if (converted) {
            counts.converted += 1;
        }

        followUpSummary[
            followUpStatus
        ] += 1;

        incrementMap(
            assetCounts,
            row.latestAsset
        );

        incrementMap(
            intentCounts,
            row.latestIntent
        );

        if (
            !row.latestLanguage
            || row.latestLanguage
                === "unknown"
        ) {
            unknownLanguageUsers += 1;
        }

        if (
            !row.latestAiMode
            || row.latestAiMode
                === "unknown"
        ) {
            unknownAiModeUsers += 1;
        }
    }

    const stageDefinitions = [
        [
            "conversations",
            "有效对话"
        ],
        [
            "valueDelivered",
            "AI 交付价值"
        ],
        [
            "ctaShown",
            "CTA 展示"
        ],
        [
            "ctaClicked",
            "CTA 点击"
        ],
        [
            "contacted",
            "人工跟进"
        ],
        [
            "joinedWhatsapp",
            "已加入 WhatsApp"
        ],
        [
            "converted",
            "已转化"
        ]
    ];

    const stages =
        stageDefinitions
        .map(
            ([key, label], index) => {
                const previousKey =
                    index > 0
                    ? stageDefinitions[
                        index - 1
                    ][0]
                    : null;

                return {
                    key,
                    label,
                    count:
                        counts[key],
                    previousRate:
                        previousKey
                        ? calculateRate(
                            counts[key],
                            counts[
                                previousKey
                            ]
                        )
                        : counts.conversations
                        ? 100
                        : 0,
                    overallRate:
                        calculateRate(
                            counts[key],
                            counts
                                .conversations
                        ),
                    dropOff:
                        previousKey
                        ? Math.max(
                            0,
                            counts[
                                previousKey
                            ]
                            - counts[key]
                        )
                        : 0
                };
            }
        );

    return {
        success: true,
        generatedAt:
            new Date()
            .toISOString(),
        filters:
            serializeFilters(options),
        counts,
        stages,
        followUpSummary,
        topAssets:
            mapTopValues(
                assetCounts
            ),
        topIntents:
            mapTopValues(
                intentCounts
            ),
        daily:
            normalizeDailyRows(
                dailyRows
            ),
        dataQuality: {
            unknownLanguageUsers,
            unknownAiModeUsers
        }
    };
}


module.exports = {
    FUNNEL_EVENT_TYPES,
    ALLOWED_RANGES,
    ALLOWED_LANGUAGES,
    ALLOWED_AI_MODES,
    ALLOWED_LEAD_LEVELS,
    FOLLOW_UP_STATUS_ORDER,
    normalizeOptions,
    resolveDateRange,
    buildEventMatch,
    buildUserPipeline,
    buildDailyPipeline,
    normalizeDailyRows,
    calculateRate,
    getFunnel
};
