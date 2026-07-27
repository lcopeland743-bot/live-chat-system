/**
 * Meridian Admin Session Query Service
 *
 * Server-side conversation search, filters, pagination,
 * manual labels, and deterministic lead-intent scoring.
 *
 * Version:
 * v2.4.2
 */

const Session =
require("../database/models/session-model");


const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 30;


const ALLOWED_STATUS =
new Set([
    "all",
    "online",
    "offline"
]);


const ALLOWED_AI_MODES =
new Set([
    "all",
    "off",
    "assist",
    "auto"
]);


const ALLOWED_INTENT_LEVELS =
new Set([
    "all",
    "high",
    "medium",
    "low"
]);


const ALLOWED_WHATSAPP_FILTERS =
new Set([
    "all",
    "clicked",
    "cta_shown",
    "not_clicked",
    "no_push"
]);


const ALLOWED_UNREAD_FILTERS =
new Set([
    "all",
    "unread",
    "read"
]);


const ALLOWED_TAKEOVER_FILTERS =
new Set([
    "all",
    "human",
    "ai"
]);


const ALLOWED_PRIORITIES =
new Set([
    "all",
    "low",
    "normal",
    "high",
    "vip"
]);


const ALLOWED_FOLLOW_UP_STATUSES =
new Set([
    "all",
    "not_followed_up",
    "contacted",
    "joined_whatsapp",
    "converted",
    "invalid"
]);


const ALLOWED_SORTS =
new Set([
    "recent",
    "intent"
]);


const SYSTEM_TAGS = [
    "短线交易者",
    "长期投资者",
    "已持仓",
    "准备买入",
    "需要入场计划",
    "高参与",
    "WhatsApp已点击",
    "已展示CTA",
    "已联系",
    "已加入WhatsApp",
    "已转化",
    "无效客户",
    "高流失风险",
    "禁止推送"
];


const KNOWN_TAG_CACHE_MS =
60 * 1000;


let knownTagCache = {
    expiresAt: 0,
    values:
        SYSTEM_TAGS.slice()
};


function clampInteger(
    value,
    minimum,
    maximum,
    fallback
) {
    const numeric =
        Number.parseInt(
            value,
            10
        );

    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    return Math.min(
        maximum,
        Math.max(
            minimum,
            numeric
        )
    );
}


function normalizeEnum(
    value,
    allowed,
    fallback = "all"
) {
    const normalized =
        String(value || fallback)
        .trim()
        .toLowerCase();

    return allowed.has(normalized)
        ? normalized
        : fallback;
}


function normalizeSearch(value) {
    return String(value || "")
    .trim()
    .slice(
        0,
        MAX_SEARCH_LENGTH
    );
}


function normalizeListOptions(
    input = {}
) {
    return {
        q:
            normalizeSearch(input.q),
        status:
            normalizeEnum(
                input.status,
                ALLOWED_STATUS
            ),
        aiMode:
            normalizeEnum(
                input.aiMode,
                ALLOWED_AI_MODES
            ),
        intentLevel:
            normalizeEnum(
                input.intentLevel,
                ALLOWED_INTENT_LEVELS
            ),
        whatsapp:
            normalizeEnum(
                input.whatsapp,
                ALLOWED_WHATSAPP_FILTERS
            ),
        unread:
            normalizeEnum(
                input.unread,
                ALLOWED_UNREAD_FILTERS
            ),
        takeover:
            normalizeEnum(
                input.takeover,
                ALLOWED_TAKEOVER_FILTERS
            ),
        priority:
            normalizeEnum(
                input.priority,
                ALLOWED_PRIORITIES
            ),
        followUpStatus:
            normalizeEnum(
                input.followUpStatus,
                ALLOWED_FOLLOW_UP_STATUSES
            ),
        tag:
            normalizeSearch(input.tag)
            .slice(
                0,
                MAX_TAG_LENGTH
            ),
        sort:
            normalizeEnum(
                input.sort,
                ALLOWED_SORTS,
                "recent"
            ),
        page:
            clampInteger(
                input.page,
                1,
                100000,
                1
            ),
        limit:
            clampInteger(
                input.limit,
                1,
                MAX_PAGE_SIZE,
                DEFAULT_PAGE_SIZE
            )
    };
}


function escapeRegex(value) {
    return String(value || "")
    .replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


function hasConversationMatch() {
    return {
        $expr: {
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
    };
}


function buildAutomaticTagMatch(value) {
    const tag =
        String(value || "")
        .trim();

    const mappings = {
        "短线交易者": {
            "conversionState.investmentHorizon":
                "short_term"
        },
        "长期投资者": {
            "conversionState.investmentHorizon":
                "long_term"
        },
        "已持仓": {
            "conversionState.positionStatus":
                "holding"
        },
        "准备买入": {
            "conversionState.positionStatus":
                "planning"
        },
        "需要入场计划": {
            "conversionState.entryPlan": {
                $in: [
                    "market_now",
                    "wait_pullback",
                    "staged_entry",
                    "watchlist"
                ]
            }
        },
        "高参与": {
            "conversionState.engagementSignal": {
                $in: [
                    "engaged",
                    "closing"
                ]
            }
        },
        "WhatsApp已点击": {
            "conversionState.whatsappClicked":
                true
        },
        "已展示CTA": {
            "conversionState.ctaShownCount": {
                $gt: 0
            }
        },
        "已联系": {
            followUpStatus:
                "contacted"
        },
        "已加入WhatsApp": {
            followUpStatus:
                "joined_whatsapp"
        },
        "已转化": {
            followUpStatus:
                "converted"
        },
        "无效客户": {
            followUpStatus:
                "invalid"
        },
        "高流失风险": {
            "conversionState.exitRisk":
                "high"
        },
        "禁止推送": {
            "conversionState.doNotPush":
                true
        }
    };

    return mappings[tag]
        || null;
}


function buildBaseMatch(options) {
    const clauses = [
        hasConversationMatch()
    ];

    if (options.status !== "all") {
        clauses.push({
            status:
                options.status
        });
    }

    if (options.aiMode !== "all") {
        if (options.aiMode === "auto") {
            clauses.push({
                $or: [
                    {
                        aiMode: "auto"
                    },
                    {
                        aiMode: {
                            $exists: false
                        }
                    }
                ]
            });
        }
        else {
            clauses.push({
                aiMode:
                    options.aiMode
            });
        }
    }

    if (options.priority !== "all") {
        if (options.priority === "normal") {
            clauses.push({
                $or: [
                    {
                        priority: "normal"
                    },
                    {
                        priority: {
                            $exists: false
                        }
                    }
                ]
            });
        }
        else {
            clauses.push({
                priority:
                    options.priority
            });
        }
    }

    if (
        options.followUpStatus
        !== "all"
    ) {
        if (
            options.followUpStatus
            === "not_followed_up"
        ) {
            clauses.push({
                $or: [
                    {
                        followUpStatus:
                            "not_followed_up"
                    },
                    {
                        followUpStatus: {
                            $exists: false
                        }
                    }
                ]
            });
        }
        else {
            clauses.push({
                followUpStatus:
                    options.followUpStatus
            });
        }
    }

    if (options.unread === "unread") {
        clauses.push({
            unreadCount: {
                $gt: 0
            }
        });
    }

    if (options.unread === "read") {
        clauses.push({
            $or: [
                {
                    unreadCount: {
                        $exists: false
                    }
                },
                {
                    unreadCount: {
                        $lte: 0
                    }
                }
            ]
        });
    }

    if (options.takeover === "human") {
        clauses.push({
            humanTakeover: true
        });
    }

    if (options.takeover === "ai") {
        clauses.push({
            humanTakeover: {
                $ne: true
            }
        });
    }

    if (options.whatsapp === "clicked") {
        clauses.push({
            "conversionState.whatsappClicked":
                true
        });
    }

    if (options.whatsapp === "cta_shown") {
        clauses.push({
            "conversionState.ctaShownCount": {
                $gt: 0
            }
        });
    }

    if (options.whatsapp === "not_clicked") {
        clauses.push({
            "conversionState.whatsappClicked": {
                $ne: true
            }
        });
    }

    if (options.whatsapp === "no_push") {
        clauses.push({
            "conversionState.doNotPush":
                true
        });
    }

    if (options.tag) {
        const tagRegex =
            new RegExp(
                escapeRegex(options.tag),
                "i"
            );

        const tagMatches = [
            {
                tags:
                    tagRegex
            },
            {
                "conversionState.asset":
                    tagRegex
            }
        ];

        const automaticTagMatch =
            buildAutomaticTagMatch(
                options.tag
            );

        if (automaticTagMatch) {
            tagMatches.push(
                automaticTagMatch
            );
        }

        clauses.push({
            $or:
                tagMatches
        });
    }

    if (options.q) {
        const searchRegex =
            new RegExp(
                escapeRegex(options.q),
                "i"
            );

        clauses.push({
            $or: [
                {
                    userId:
                        searchRegex
                },
                {
                    customerId:
                        searchRegex
                },
                {
                    lastMessage:
                        searchRegex
                },
                {
                    tags:
                        searchRegex
                },
                {
                    "conversionState.asset":
                        searchRegex
                },
                {
                    "conversionState.intent":
                        searchRegex
                }
            ]
        });
    }

    return clauses.length === 1
        ? clauses[0]
        : {
            $and: clauses
        };
}


function buildLeadScoreExpression() {
    return {
        $add: [
            {
                $cond: [
                    {
                        $eq: [
                            "$conversionState.whatsappClicked",
                            true
                        ]
                    },
                    60,
                    0
                ]
            },
            {
                $switch: {
                    branches: [
                        {
                            case: {
                                $eq: [
                                    "$conversionState.positionStatus",
                                    "holding"
                                ]
                            },
                            then: 20
                        },
                        {
                            case: {
                                $eq: [
                                    "$conversionState.positionStatus",
                                    "planning"
                                ]
                            },
                            then: 18
                        }
                    ],
                    default: 0
                }
            },
            {
                $cond: [
                    {
                        $and: [
                            {
                                $ne: [
                                    {
                                        $ifNull: [
                                            "$conversionState.asset",
                                            ""
                                        ]
                                    },
                                    ""
                                ]
                            },
                            {
                                $ne: [
                                    {
                                        $ifNull: [
                                            "$conversionState.asset",
                                            ""
                                        ]
                                    },
                                    "unknown"
                                ]
                            }
                        ]
                    },
                    10,
                    0
                ]
            },
            {
                $switch: {
                    branches: [
                        {
                            case: {
                                $gte: [
                                    {
                                        $ifNull: [
                                            "$conversionState.engagementScore",
                                            0
                                        ]
                                    },
                                    70
                                ]
                            },
                            then: 25
                        },
                        {
                            case: {
                                $gte: [
                                    {
                                        $ifNull: [
                                            "$conversionState.engagementScore",
                                            0
                                        ]
                                    },
                                    40
                                ]
                            },
                            then: 15
                        },
                        {
                            case: {
                                $gte: [
                                    {
                                        $ifNull: [
                                            "$conversionState.engagementScore",
                                            0
                                        ]
                                    },
                                    20
                                ]
                            },
                            then: 5
                        }
                    ],
                    default: 0
                }
            },
            {
                $switch: {
                    branches: [
                        {
                            case: {
                                $in: [
                                    "$conversionState.engagementSignal",
                                    [
                                        "engaged",
                                        "closing"
                                    ]
                                ]
                            },
                            then: 20
                        },
                        {
                            case: {
                                $eq: [
                                    "$conversionState.engagementSignal",
                                    "interested"
                                ]
                            },
                            then: 10
                        },
                        {
                            case: {
                                $eq: [
                                    "$conversionState.engagementSignal",
                                    "hesitant"
                                ]
                            },
                            then: 5
                        },
                        {
                            case: {
                                $eq: [
                                    "$conversionState.engagementSignal",
                                    "negative"
                                ]
                            },
                            then: -25
                        }
                    ],
                    default: 0
                }
            },
            {
                $cond: [
                    {
                        $gt: [
                            {
                                $ifNull: [
                                    "$conversionState.ctaShownCount",
                                    0
                                ]
                            },
                            0
                        ]
                    },
                    10,
                    0
                ]
            },
            {
                $switch: {
                    branches: [
                        {
                            case: {
                                $gte: [
                                    {
                                        $ifNull: [
                                            "$conversionState.aiReplyCount",
                                            0
                                        ]
                                    },
                                    3
                                ]
                            },
                            then: 10
                        },
                        {
                            case: {
                                $gte: [
                                    {
                                        $ifNull: [
                                            "$conversionState.aiReplyCount",
                                            0
                                        ]
                                    },
                                    1
                                ]
                            },
                            then: 5
                        }
                    ],
                    default: 0
                }
            },
            {
                $cond: [
                    {
                        $and: [
                            {
                                $ne: [
                                    {
                                        $ifNull: [
                                            "$conversionState.intent",
                                            "unknown"
                                        ]
                                    },
                                    "unknown"
                                ]
                            },
                            {
                                $ne: [
                                    {
                                        $ifNull: [
                                            "$conversionState.intent",
                                            ""
                                        ]
                                    },
                                    ""
                                ]
                            }
                        ]
                    },
                    10,
                    0
                ]
            },
            {
                $cond: [
                    {
                        $not: [
                            {
                                $in: [
                                    {
                                        $ifNull: [
                                            "$conversionState.entryPlan",
                                            "unknown"
                                        ]
                                    },
                                    [
                                        "unknown",
                                        "not_applicable"
                                    ]
                                ]
                            }
                        ]
                    },
                    10,
                    0
                ]
            },
            {
                $switch: {
                    branches: [
                        {
                            case: {
                                $eq: [
                                    "$conversionState.exitRisk",
                                    "high"
                                ]
                            },
                            then: -20
                        },
                        {
                            case: {
                                $eq: [
                                    "$conversionState.exitRisk",
                                    "medium"
                                ]
                            },
                            then: -10
                        }
                    ],
                    default: 0
                }
            }
        ]
    };
}


function buildListPipeline(options) {
    const skip =
        (options.page - 1)
        * options.limit;

    const sort =
        options.sort === "intent"
        ? {
            _leadScore: -1,
            updatedAt: -1,
            _id: -1
        }
        : {
            updatedAt: -1,
            lastMessageAt: -1,
            _id: -1
        };

    const pipeline = [
        {
            $match:
                buildBaseMatch(options)
        },
        {
            $set: {
                _leadScoreRaw:
                    buildLeadScoreExpression()
            }
        },
        {
            $set: {
                _leadScore: {
                    $cond: [
                        {
                            $eq: [
                                "$conversionState.doNotPush",
                                true
                            ]
                        },
                        0,
                        {
                            $cond: [
                                {
                                    $lt: [
                                        "$_leadScoreRaw",
                                        0
                                    ]
                                },
                                0,
                                {
                                    $cond: [
                                        {
                                            $gt: [
                                                "$_leadScoreRaw",
                                                100
                                            ]
                                        },
                                        100,
                                        "$_leadScoreRaw"
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        },
        {
            $set: {
                _leadLevel: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $gte: [
                                        "$_leadScore",
                                        60
                                    ]
                                },
                                then: "high"
                            },
                            {
                                case: {
                                    $gte: [
                                        "$_leadScore",
                                        30
                                    ]
                                },
                                then: "medium"
                            }
                        ],
                        default: "low"
                    }
                }
            }
        }
    ];

    const intentMatch =
        options.intentLevel !== "all"
        ? {
            $match: {
                _leadLevel:
                    options.intentLevel
            }
        }
        : null;

    const sessionStages = [];
    const metadataStages = [];

    if (intentMatch) {
        sessionStages.push(
            intentMatch
        );
        metadataStages.push(
            intentMatch
        );
    }

    sessionStages.push(
        {
            $sort: sort
        },
        {
            $skip: skip
        },
        {
            $limit:
                options.limit
        },
        {
            $project: {
                _leadScoreRaw: 0
            }
        }
    );

    metadataStages.push({
        $count: "total"
    });

    pipeline.push({
        $facet: {
            sessions:
                sessionStages,
            metadata:
                metadataStages,
            intentSummary: [
                {
                    $group: {
                        _id:
                            "$_leadLevel",
                        count: {
                            $sum: 1
                        }
                    }
                }
            ]
        }
    });

    return pipeline;
}


function normalizeConversionState(session) {
    return session
        && session.conversionState
        && typeof session.conversionState === "object"
        ? session.conversionState
        : {};
}


function calculateLeadScore(session) {
    const conversion =
        normalizeConversionState(session);

    if (conversion.doNotPush === true) {
        return 0;
    }

    let score = 0;

    if (conversion.whatsappClicked === true) {
        score += 60;
    }

    if (conversion.positionStatus === "holding") {
        score += 20;
    }
    else if (
        conversion.positionStatus === "planning"
    ) {
        score += 18;
    }

    const asset =
        String(
            conversion.asset || ""
        )
        .trim();

    if (
        asset
        && asset.toLowerCase() !== "unknown"
    ) {
        score += 10;
    }

    const engagementScore =
        Number(
            conversion.engagementScore
            || 0
        );

    if (engagementScore >= 70) {
        score += 25;
    }
    else if (engagementScore >= 40) {
        score += 15;
    }
    else if (engagementScore >= 20) {
        score += 5;
    }

    if (
        conversion.engagementSignal === "engaged"
        || conversion.engagementSignal === "closing"
    ) {
        score += 20;
    }
    else if (
        conversion.engagementSignal === "interested"
    ) {
        score += 10;
    }
    else if (
        conversion.engagementSignal === "hesitant"
    ) {
        score += 5;
    }
    else if (
        conversion.engagementSignal === "negative"
    ) {
        score -= 25;
    }

    if (
        Number(
            conversion.ctaShownCount
            || 0
        ) > 0
    ) {
        score += 10;
    }

    const replyCount =
        Number(
            conversion.aiReplyCount
            || 0
        );

    if (replyCount >= 3) {
        score += 10;
    }
    else if (replyCount >= 1) {
        score += 5;
    }

    const intent =
        String(
            conversion.intent || ""
        )
        .trim()
        .toLowerCase();

    if (
        intent
        && intent !== "unknown"
    ) {
        score += 10;
    }

    if (
        conversion.entryPlan
        && conversion.entryPlan !== "unknown"
        && conversion.entryPlan !== "not_applicable"
    ) {
        score += 10;
    }

    if (conversion.exitRisk === "high") {
        score -= 20;
    }
    else if (
        conversion.exitRisk === "medium"
    ) {
        score -= 10;
    }

    return Math.min(
        100,
        Math.max(
            0,
            score
        )
    );
}


function deriveAutoTags(session) {
    const conversion =
        normalizeConversionState(session);

    const tags = [];

    if (
        conversion.investmentHorizon
        === "short_term"
    ) {
        tags.push("短线交易者");
    }

    if (
        conversion.investmentHorizon
        === "long_term"
    ) {
        tags.push("长期投资者");
    }

    if (
        conversion.positionStatus
        === "holding"
    ) {
        tags.push("已持仓");
    }

    if (
        conversion.positionStatus
        === "planning"
    ) {
        tags.push("准备买入");
    }

    if (
        conversion.entryPlan
        && conversion.entryPlan !== "unknown"
        && conversion.entryPlan !== "not_applicable"
    ) {
        tags.push("需要入场计划");
    }

    const asset =
        String(
            conversion.asset || ""
        )
        .trim()
        .toUpperCase()
        .slice(0, 30);

    if (
        asset
        && asset !== "UNKNOWN"
    ) {
        tags.push(asset);
    }

    if (
        conversion.engagementSignal === "engaged"
        || conversion.engagementSignal === "closing"
    ) {
        tags.push("高参与");
    }

    if (conversion.whatsappClicked === true) {
        tags.push("WhatsApp已点击");
    }
    else if (
        Number(
            conversion.ctaShownCount
            || 0
        ) > 0
    ) {
        tags.push("已展示CTA");
    }

    if (session.followUpStatus === "contacted") {
        tags.push("已联系");
    }
    else if (
        session.followUpStatus
        === "joined_whatsapp"
    ) {
        tags.push("已加入WhatsApp");
    }
    else if (
        session.followUpStatus
        === "converted"
    ) {
        tags.push("已转化");
    }
    else if (
        session.followUpStatus
        === "invalid"
    ) {
        tags.push("无效客户");
    }

    if (conversion.exitRisk === "high") {
        tags.push("高流失风险");
    }

    if (conversion.doNotPush === true) {
        tags.push("禁止推送");
    }

    return Array.from(
        new Set(tags)
    );
}


function deriveLeadReasons(session) {
    const conversion =
        normalizeConversionState(session);

    if (conversion.doNotPush === true) {
        return [
            "客户已标记为禁止推送"
        ];
    }

    const reasons = [];

    if (conversion.whatsappClicked === true) {
        reasons.push("已点击 WhatsApp");
    }

    if (conversion.positionStatus === "holding") {
        reasons.push("已有持仓");
    }
    else if (
        conversion.positionStatus === "planning"
    ) {
        reasons.push("计划买入");
    }

    const asset =
        String(
            conversion.asset || ""
        )
        .trim()
        .toUpperCase()
        .slice(0, 30);

    if (
        asset
        && asset !== "UNKNOWN"
    ) {
        reasons.push(
            `关注 ${asset}`
        );
    }

    if (
        conversion.engagementSignal === "engaged"
        || conversion.engagementSignal === "closing"
    ) {
        reasons.push("对话参与度高");
    }
    else if (
        Number(
            conversion.engagementScore
            || 0
        ) >= 40
    ) {
        reasons.push("持续参与对话");
    }

    if (
        conversion.entryPlan
        && conversion.entryPlan !== "unknown"
        && conversion.entryPlan !== "not_applicable"
    ) {
        reasons.push("需要具体入场计划");
    }

    if (
        Number(
            conversion.ctaShownCount
            || 0
        ) > 0
        && conversion.whatsappClicked !== true
    ) {
        reasons.push("已展示 WhatsApp CTA");
    }

    if (
        conversion.intent
        && conversion.intent !== "unknown"
    ) {
        reasons.push(
            `意图：${String(conversion.intent).slice(0, 50)}`
        );
    }

    if (conversion.exitRisk === "high") {
        reasons.push("存在较高流失风险");
    }

    if (!reasons.length) {
        reasons.push("尚未形成明确交易意图");
    }

    return reasons.slice(
        0,
        5
    );
}


function deriveLeadProfile(session) {
    const score =
        calculateLeadScore(session);

    const level =
        score >= 60
        ? "high"
        : score >= 30
        ? "medium"
        : "low";

    return {
        level,
        score,
        reasons:
            deriveLeadReasons(session)
    };
}


function toPlainSession(session) {
    if (!session) {
        return null;
    }

    if (
        typeof session.toObject
        === "function"
    ) {
        return session.toObject();
    }

    return {
        ...session
    };
}


function enrichSession(session) {
    const plain =
        toPlainSession(session);

    if (!plain) {
        return null;
    }

    delete plain._leadScoreRaw;
    delete plain._leadScore;
    delete plain._leadLevel;

    plain.leadIntent =
        deriveLeadProfile(plain);

    plain.autoTags =
        deriveAutoTags(plain);

    plain.followUpStatus =
        ALLOWED_FOLLOW_UP_STATUSES.has(
            plain.followUpStatus
        )
        && plain.followUpStatus !== "all"
        ? plain.followUpStatus
        : "not_followed_up";

    plain.followUpUpdatedAt =
        plain.followUpUpdatedAt
        || null;

    return plain;
}


function normalizeTags(value) {
    if (!Array.isArray(value)) {
        const error =
            new Error(
                "Tags must be an array."
            );

        error.code =
            "INVALID_TAGS";

        throw error;
    }

    const normalized = [];
    const seen = new Set();

    for (const rawTag of value) {
        const tag =
            String(rawTag || "")
            .trim();

        if (!tag) {
            continue;
        }

        if (
            /[\u0000-\u001F\u007F]/
            .test(tag)
        ) {
            const error =
                new Error(
                    "Tags cannot contain control characters."
                );

            error.code =
                "INVALID_TAG_CHARACTERS";

            throw error;
        }

        if (tag.length > MAX_TAG_LENGTH) {
            const error =
                new Error(
                    `Each tag must be ${MAX_TAG_LENGTH} characters or fewer.`
                );

            error.code =
                "INVALID_TAG_LENGTH";

            throw error;
        }

        const key =
            tag.toLocaleLowerCase();

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        normalized.push(tag);

        if (normalized.length > MAX_TAGS) {
            const error =
                new Error(
                    `A session can have at most ${MAX_TAGS} tags.`
                );

            error.code =
                "TOO_MANY_TAGS";

            throw error;
        }
    }

    return normalized;
}


function normalizePriority(value) {
    const priority =
        String(value || "")
        .trim()
        .toLowerCase();

    if (
        !priority
        || priority === "all"
        || !ALLOWED_PRIORITIES.has(priority)
    ) {
        const error =
            new Error(
                "Invalid priority."
            );

        error.code =
            "INVALID_PRIORITY";

        throw error;
    }

    return priority;
}


function normalizeFollowUpStatus(value) {
    const status =
        String(value || "")
        .trim()
        .toLowerCase();

    if (
        !status
        || status === "all"
        || !ALLOWED_FOLLOW_UP_STATUSES
            .has(status)
    ) {
        const error =
            new Error(
                "Invalid follow-up status."
            );

        error.code =
            "INVALID_FOLLOW_UP_STATUS";

        throw error;
    }

    return status;
}


function invalidateKnownTagCache() {
    knownTagCache = {
        expiresAt: 0,
        values:
            SYSTEM_TAGS.slice()
    };
}


async function getKnownTags() {
    const now =
        Date.now();

    if (
        knownTagCache.expiresAt > now
        && Array.isArray(
            knownTagCache.values
        )
    ) {
        return knownTagCache
        .values
        .slice();
    }

    let storedTags = [];

    if (
        typeof Session.distinct
        === "function"
    ) {
        try {
            storedTags =
                await Session.distinct(
                    "tags",
                    {
                        tags: {
                            $exists: true,
                            $ne: ""
                        }
                    }
                );
        }
        catch (error) {
            console.warn(
                "[Admin Lead Tags] Unable to refresh known tags:",
                error.message
            );

            storedTags =
                knownTagCache.values
                || [];
        }
    }

    const values =
        Array.from(
            new Set(
                [
                    ...(storedTags || []),
                    ...SYSTEM_TAGS
                ]
                .map(tag =>
                    String(tag || "").trim()
                )
                .filter(Boolean)
            )
        )
        .sort((a, b) =>
            a.localeCompare(b)
        )
        .slice(0, 200);

    knownTagCache = {
        expiresAt:
            now + KNOWN_TAG_CACHE_MS,
        values
    };

    return values.slice();
}


async function listSessions(input = {}) {
    const options =
        normalizeListOptions(input);

    const result =
        await Session.aggregate(
            buildListPipeline(options)
        );

    const overview =
        result[0]
        || {};

    const sessions =
        Array.isArray(overview.sessions)
        ? overview.sessions
            .map(enrichSession)
            .filter(Boolean)
        : [];

    const total =
        overview.metadata
        && overview.metadata[0]
        ? Math.max(
            0,
            Number(
                overview.metadata[0].total
                || 0
            )
        )
        : 0;

    const summary = {
        high: 0,
        medium: 0,
        low: 0
    };

    for (
        const row of
        overview.intentSummary
        || []
    ) {
        if (
            Object.prototype
            .hasOwnProperty.call(
                summary,
                row._id
            )
        ) {
            summary[row._id] =
                Math.max(
                    0,
                    Number(row.count) || 0
                );
        }
    }

    const knownTags =
        await getKnownTags();

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total / options.limit
            )
        );

    return {
        sessions,
        pagination: {
            page:
                options.page,
            limit:
                options.limit,
            total,
            totalPages,
            hasPrevious:
                options.page > 1,
            hasNext:
                options.page < totalPages
        },
        intentSummary:
            summary,
        knownTags,
        filters:
            options
    };
}


async function getSession(userId) {
    const session =
        await Session.findOne({
            userId:
                String(userId || "")
                .trim()
        });

    return enrichSession(session);
}


async function updateLabels(
    userId,
    payload = {}
) {
    const update = {};

    if (
        Object.prototype
        .hasOwnProperty.call(
            payload,
            "tags"
        )
    ) {
        update.tags =
            normalizeTags(payload.tags);
    }

    if (
        Object.prototype
        .hasOwnProperty.call(
            payload,
            "priority"
        )
    ) {
        update.priority =
            normalizePriority(
                payload.priority
            );
    }

    if (!Object.keys(update).length) {
        const error =
            new Error(
                "No label changes were supplied."
            );

        error.code =
            "EMPTY_LABEL_UPDATE";

        throw error;
    }

    if (
        Object.prototype
        .hasOwnProperty.call(
            update,
            "tags"
        )
    ) {
        invalidateKnownTagCache();
    }

    const session =
        await Session.findOneAndUpdate(
            {
                userId:
                    String(userId || "")
                    .trim()
            },
            {
                $set:
                    update
            },
            {
                new: true,
                runValidators: true
            }
        );

    return enrichSession(session);
}


async function updateFollowUp(
    userId,
    payload = {}
) {
    const status =
        normalizeFollowUpStatus(
            payload.status
        );

    const normalizedUserId =
        String(userId || "")
        .trim();

    const existing =
        await Session.findOne({
            userId:
                normalizedUserId
        });

    if (!existing) {
        return null;
    }

    const previousStatus =
        ALLOWED_FOLLOW_UP_STATUSES.has(
            existing.followUpStatus
        )
        && existing.followUpStatus !== "all"
        ? existing.followUpStatus
        : "not_followed_up";

    const updatedAt =
        new Date();

    const session =
        await Session.findOneAndUpdate(
            {
                userId:
                    normalizedUserId
            },
            {
                $set: {
                    followUpStatus:
                        status,
                    followUpUpdatedAt:
                        updatedAt,
                    followUpUpdatedBy:
                        String(
                            payload.updatedBy
                            || "admin"
                        )
                        .trim()
                        .slice(0, 80)
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

    return {
        session:
            enrichSession(session),
        previousStatus,
        updatedAt
    };
}


module.exports = {
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    MAX_TAGS,
    MAX_TAG_LENGTH,
    SYSTEM_TAGS,
    ALLOWED_FOLLOW_UP_STATUSES,
    normalizeListOptions,
    buildAutomaticTagMatch,
    buildBaseMatch,
    buildLeadScoreExpression,
    buildListPipeline,
    calculateLeadScore,
    deriveAutoTags,
    deriveLeadReasons,
    deriveLeadProfile,
    enrichSession,
    normalizeTags,
    normalizePriority,
    normalizeFollowUpStatus,
    invalidateKnownTagCache,
    getKnownTags,
    listSessions,
    getSession,
    updateLabels,
    updateFollowUp
};
