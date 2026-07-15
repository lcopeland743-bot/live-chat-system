/**
 * Meridian Conversion Event Model
 *
 * Version:
 * v2.3.2
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
                "human_takeover"
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
