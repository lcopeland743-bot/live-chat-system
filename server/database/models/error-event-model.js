/**
 * Meridian Error Event Model
 *
 * Version:
 * v2.3.10
 */

const mongoose =
require("mongoose");


const dataRetentionConfig =
require("../../config/data-retention-config");


const errorEventSchema =
new mongoose.Schema(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        fingerprint: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        level: {
            type: String,
            enum: [
                "warning",
                "error",
                "critical"
            ],
            required: true,
            index: true
        },

        source: {
            type: String,
            required: true,
            index: true
        },

        code: {
            type: String,
            default: null,
            index: true
        },

        name: {
            type: String,
            default: "Error"
        },

        message: {
            type: String,
            required: true
        },

        stack: {
            type: String,
            default: null
        },

        context: {
            type: Object,
            default: () => ({})
        },

        recovered: {
            type: Boolean,
            default: false,
            index: true
        },

        occurrenceCount: {
            type: Number,
            default: 1,
            min: 1
        },

        firstSeenAt: {
            type: Date,
            default: Date.now,
            index: true
        },

        lastSeenAt: {
            type: Date,
            default: Date.now,
            index: true
        },

        resolved: {
            type: Boolean,
            default: false,
            index: true
        },

        resolvedAt: {
            type: Date,
            default: null
        },

        expiresAt: {
            type: Date,
            default: () => {
                return dataRetentionConfig
                .calculateErrorEventExpiry(
                    new Date()
                );
            }
        }
    },
    {
        timestamps: true
    }
);


errorEventSchema.index({
    resolved: 1,
    level: 1,
    lastSeenAt: -1
});


errorEventSchema.index(
    {
        expiresAt: 1
    },
    {
        expireAfterSeconds: 0,
        name: "error_event_expiry_ttl"
    }
);


module.exports =
mongoose.model(
    "ErrorEvent",
    errorEventSchema
);
