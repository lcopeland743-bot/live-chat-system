/**
 * Meridian Conversion Structured Output Schema
 *
 * Version:
 * v2.3.7
 */

const conversionConfig =
require("../config/conversion-config");

const conversionResponseSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "replyText",
        "intent",
        "asset",
        "investmentHorizon",
        "positionStatus",
        "entryPlan",
        "engagementSignal",
        "exitRisk",
        "valueDelivered",
        "reservedValue",
        "reservedValueType",
        "question",
        "ctaRecommendation",
        "ctaTitle",
        "ctaButtonText",
        "whatsappPrefill",
        "needsWebSearch",
        "needsHuman",
        "dataRequest"
    ],
    properties: {
        replyText: {
            type: "string",
            minLength: 1,
            maxLength: conversionConfig.replyCharacterLimit
        },

        intent: {
            type: "string",
            enum: [
                "unknown",
                "service_inquiry",
                "asset_research",
                "current_quote",
                "market_today",
                "company_news",
                "market_news",
                "earnings",
                "macro",
                "entry_plan",
                "holding_review",
                "risk_management",
                "long_term",
                "short_term",
                "sector_outlook",
                "asset_comparison",
                "long_term_selection",
                "short_term_selection",
                "whatsapp_request",
                "refusal",
                "conversation_close"
            ]
        },

        asset: {
            type: ["string", "null"],
            maxLength: 24
        },

        investmentHorizon: {
            type: "string",
            enum: [
                "unknown",
                "short_term",
                "medium_term",
                "long_term"
            ]
        },

        positionStatus: {
            type: "string",
            enum: [
                "unknown",
                "not_entered",
                "planning",
                "holding",
                "exited"
            ]
        },

        entryPlan: {
            type: "string",
            enum: [
                "unknown",
                "market_now",
                "wait_pullback",
                "staged_entry",
                "watchlist",
                "not_applicable"
            ]
        },

        engagementSignal: {
            type: "string",
            enum: [
                "neutral",
                "interested",
                "engaged",
                "hesitant",
                "closing",
                "negative"
            ]
        },

        exitRisk: {
            type: "string",
            enum: [
                "low",
                "medium",
                "high"
            ]
        },

        valueDelivered: {
            type: "string",
            minLength: 1,
            maxLength: 220
        },

        reservedValue: {
            type: ["string", "null"],
            maxLength: 220
        },

        reservedValueType: {
            type: "string",
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
            ]
        },

        question: {
            type: ["string", "null"],
            maxLength: 100
        },

        ctaRecommendation: {
            type: "string",
            enum: [
                "hide",
                "show",
                "urgent_show",
                "suppress"
            ]
        },

        ctaTitle: {
            type: "string",
            maxLength: 45
        },

        ctaButtonText: {
            type: "string",
            maxLength: 24
        },

        whatsappPrefill: {
            type: "string",
            maxLength: 500
        },

        needsWebSearch: {
            type: "boolean"
        },

        needsHuman: {
            type: "boolean"
        },

        dataRequest: {
            type: "object",
            additionalProperties: false,
            required: [
                "type",
                "symbols",
                "freshness",
                "required"
            ],
            properties: {
                type: {
                    type: "string",
                    enum: [
                        "none",
                        "quote",
                        "market_status",
                        "intraday",
                        "company_news",
                        "market_news",
                        "earnings",
                        "macro_event"
                    ]
                },

                symbols: {
                    type: "array",
                    maxItems: 5,
                    items: {
                        type: "string",
                        maxLength: 12
                    }
                },

                freshness: {
                    type: "string",
                    enum: [
                        "stable",
                        "current",
                        "real_time"
                    ]
                },

                required: {
                    type: "boolean"
                }
            }
        }
    }
};

const compressionResponseSchema = {
    type: "object",
    additionalProperties: false,
    required: ["replyText"],
    properties: {
        replyText: {
            type: "string",
            minLength: 1,
            maxLength: conversionConfig.replyCharacterLimit
        }
    }
};


const languageRepairResponseSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "replyText",
        "ctaTitle",
        "ctaButtonText",
        "whatsappPrefill"
    ],
    properties: {
        replyText: {
            type: "string",
            minLength: 1,
            maxLength: conversionConfig.replyCharacterLimit
        },

        ctaTitle: {
            type: "string",
            maxLength: 45
        },

        ctaButtonText: {
            type: "string",
            maxLength: 24
        },

        whatsappPrefill: {
            type: "string",
            maxLength: 500
        }
    }
};


const directAnswerRepairResponseSchema = {
    type: "object",
    additionalProperties: false,
    required: ["replyText"],
    properties: {
        replyText: {
            type: "string",
            minLength: 1,
            maxLength: conversionConfig.replyCharacterLimit
        }
    }
};


module.exports = {
    conversionResponseSchema,
    compressionResponseSchema,
    languageRepairResponseSchema,
    directAnswerRepairResponseSchema
};
