/**
 * Meridian Session Model
 *
 * MongoDB Conversation Schema
 *
 * Version:
 * v2.3.3
 */

const mongoose =
require("mongoose");


const conversionStateSchema =
new mongoose.Schema(
    {
        stage: {
            type: String,
            enum: [
                "new",
                "discovery",
                "value_proved",
                "cta_ready",
                "cta_sent",
                "closed"
            ],
            default: "new"
        },

        eligibleTurnCount: {
            type: Number,
            default: 0,
            min: 0
        },

        aiReplyCount: {
            type: Number,
            default: 0,
            min: 0
        },

        aiReplyLimitReached: {
            type: Boolean,
            default: false
        },

        aiReplyLimitReachedAt: {
            type: Date,
            default: null
        },

        intent: {
            type: String,
            default: "unknown"
        },

        asset: {
            type: String,
            default: null
        },

        investmentHorizon: {
            type: String,
            enum: [
                "unknown",
                "short_term",
                "medium_term",
                "long_term"
            ],
            default: "unknown"
        },

        positionStatus: {
            type: String,
            enum: [
                "unknown",
                "not_entered",
                "planning",
                "holding",
                "exited"
            ],
            default: "unknown"
        },

        entryPlan: {
            type: String,
            enum: [
                "unknown",
                "market_now",
                "wait_pullback",
                "staged_entry",
                "watchlist",
                "not_applicable"
            ],
            default: "unknown"
        },

        valueDelivered: {
            type: [String],
            default: []
        },

        conversionSeedDelivered: {
            type: Boolean,
            default: false
        },

        reservedValue: {
            type: String,
            default: null
        },

        reservedValueType: {
            type: String,
            enum: [
                "none",
                "entry_timing",
                "position_sizing",
                "risk_control",
                "valuation",
                "invalidation",
                "market_confirmation",
                "portfolio_fit",
                "catalyst"
            ],
            default: "none"
        },

        engagementScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        engagementSignal: {
            type: String,
            enum: [
                "neutral",
                "interested",
                "engaged",
                "hesitant",
                "closing",
                "negative"
            ],
            default: "neutral"
        },

        exitRisk: {
            type: String,
            enum: [
                "low",
                "medium",
                "high"
            ],
            default: "low"
        },

        ctaShownCount: {
            type: Number,
            default: 0,
            min: 0
        },

        lastCtaTurn: {
            type: Number,
            default: null
        },

        lastCtaTrackingId: {
            type: String,
            default: null
        },

        whatsappClicked: {
            type: Boolean,
            default: false
        },

        doNotPush: {
            type: Boolean,
            default: false
        },

        humanTakeover: {
            type: Boolean,
            default: false
        },

        lastQuestionAsked: {
            type: String,
            default: null
        },

        policyVersion: {
            type: String,
            default: "1.0.0"
        },

        promptVersion: {
            type: String,
            default: "1.0.0"
        },

        updatedAt: {
            type: Date,
            default: null
        }
    },
    {
        _id: false
    }
);


const sessionSchema =
new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true
        },

        customerId: {
            type: String,
            default: null,
            index: true
        },

        socketId: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: [
                "online",
                "offline"
            ],
            default: "online"
        },

        page: {
            type: String,
            default: ""
        },

        connectedAt: {
            type: Date,
            default: Date.now
        },

        lastSeen: {
            type: Date,
            default: null
        },

        lastMessage: {
            type: String,
            default: ""
        },

        lastMessageAt: {
            type: Date,
            default: null
        },

        lastSender: {
            type: String,
            enum: [
                "",
                "user",
                "admin",
                "ai"
            ],
            default: ""
        },

        messageCount: {
            type: Number,
            default: 0
        },

        unreadCount: {
            type: Number,
            default: 0
        },

        assignedAgentId: {
            type: String,
            default: null
        },

        assignedAgentName: {
            type: String,
            default: ""
        },

        departmentId: {
            type: String,
            default: null
        },

        conversationStatus: {
            type: String,
            enum: [
                "unassigned",
                "assigned",
                "processing",
                "closed"
            ],
            default: "unassigned"
        },

        priority: {
            type: String,
            enum: [
                "low",
                "normal",
                "high",
                "vip"
            ],
            default: "normal"
        },

        tags: [
            String
        ],

        aiMode: {
            type: String,
            enum: [
                "off",
                "assist",
                "auto"
            ],
            default: "auto",
            index: true
        },

        humanTakeover: {
            type: Boolean,
            default: false
        },

        aiUpdatedAt: {
            type: Date,
            default: null
        },

        conversionState: {
            type: conversionStateSchema,
            default: () => ({})
        },

        purgeAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


sessionSchema.index({
    userId: 1,
    status: 1
});


sessionSchema.index({
    updatedAt: -1
});


sessionSchema.index({
    assignedAgentId: 1
});


sessionSchema.index({
    "conversionState.stage": 1,
    "conversionState.whatsappClicked": 1
});


sessionSchema.index(
    {
        purgeAt: 1
    },
    {
        expireAfterSeconds: 0,
        name: "closed_session_purge_ttl"
    }
);


module.exports =
mongoose.model(
    "Session",
    sessionSchema
);
