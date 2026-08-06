/**
 * Meridian WhatsApp Settings Model
 *
 * Version:
 * v2.5.0
 *
 * Backward compatibility:
 * - activeNumber / previousNumber remain the global default number fields.
 * - numbers stores reusable WhatsApp destinations.
 * - routes binds a landing-page route key to one number entry.
 */

const mongoose = require("mongoose");

const whatsappNumberSchema = new mongoose.Schema(
    {
        numberId: {
            type: String,
            required: true,
            trim: true
        },

        label: {
            type: String,
            required: true,
            trim: true
        },

        number: {
            type: String,
            required: true,
            trim: true
        },

        enabled: {
            type: Boolean,
            default: true
        },

        updatedAt: {
            type: Date,
            default: Date.now
        },

        updatedBy: {
            type: String,
            default: ""
        }
    },
    {
        _id: false
    }
);

const whatsappRouteSchema = new mongoose.Schema(
    {
        routeKey: {
            type: String,
            required: true,
            trim: true
        },

        numberId: {
            type: String,
            required: true,
            trim: true
        },

        updatedAt: {
            type: Date,
            default: Date.now
        },

        updatedBy: {
            type: String,
            default: ""
        }
    },
    {
        _id: false
    }
);

const whatsappSettingsSchema = new mongoose.Schema(
    {
        settingsKey: {
            type: String,
            default: "global",
            unique: true,
            index: true
        },

        enabled: {
            type: Boolean,
            default: false
        },

        activeNumber: {
            type: String,
            default: ""
        },

        previousNumber: {
            type: String,
            default: ""
        },

        numbers: {
            type: [whatsappNumberSchema],
            default: []
        },

        routes: {
            type: [whatsappRouteSchema],
            default: []
        },

        updatedBy: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "WhatsappSettings",
    whatsappSettingsSchema
);
