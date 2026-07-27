/**
 * Meridian Conversion Event Model
 *
 * Version:
 * v2.4.2
 */

const mongoose =
require("mongoose");


const dataRetentionConfig =
require("../../config/data-retention-config");


const conversionEventSchema =
new mongoose.Schema(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        userId: {
            type: String,
            required: true,
            index: true
        },

        sessionId: {
            type: String,
            required: true,
            index: true
        },

        eventType: {
            type: String,
            enum: [
                "user_turn",
                "web_search_used",
                "value_delivered",
                "cta_shown",
                "cta_clicked",
                "cta_suppressed",
                "whatsapp_refused",
                "human_takeover",
                "follow_up_updated"
            ],
            required: true,
            index: true
        },

        trackingId: {
            type: String,
            default: null,
            index: true
        },

        stage: {
            type: String,
            default: ""
        },

        intent: {
            type: String,
            default: "unknown"
        },

        asset: {
            type: String,
            default: null
        },

        language: {
            type: String,
            default: "unknown",
            index: true
        },

        aiMode: {
            type: String,
            enum: [
                "unknown",
                "off",
                "assist",
                "auto"
            ],
            default: "unknown",
            index: true
        },

        data: {
            type: Object,
            default: () => ({})
        },

        expiresAt: {
            type: Date,
            default: () => {
                return dataRetentionConfig
                .calculateConversionEventExpiry(
                    new Date()
                );
            }
        }
    },
    {
        timestamps: true
    }
);


conversionEventSchema.index({
    userId: 1,
    createdAt: -1
});


conversionEventSchema.index(
    {
        createdAt: -1,
        eventType: 1,
        language: 1,
        aiMode: 1
    },
    {
        name:
            "conversion_funnel_filter_lookup"
    }
);


conversionEventSchema.index(
    {
        asset: 1,
        intent: 1,
        createdAt: -1
    },
    {
        name:
            "conversion_funnel_dimension_lookup"
    }
);


conversionEventSchema.index(
    {
        expiresAt: 1
    },
    {
        expireAfterSeconds: 0,
        name: "conversion_event_expiry_ttl"
    }
);


module.exports =
mongoose.model(
    "ConversionEvent",
    conversionEventSchema
);
