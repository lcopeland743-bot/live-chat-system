/**
 * Meridian WhatsApp Settings Model
 *
 * Version:
 * v2.4.2
 */

const mongoose = require("mongoose");

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
