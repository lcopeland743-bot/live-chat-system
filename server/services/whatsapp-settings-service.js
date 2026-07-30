/**
 * Meridian WhatsApp Settings Service
 *
 * Version:
 * v2.4.2
 *
 * Resolution order:
 * 1. Admin-managed MongoDB settings
 * 2. Environment fallback
 * 3. Disabled when neither contains a valid number
 */

const WhatsappSettings =
require("../database/models/whatsapp-settings-model");

const conversionConfig =
require("../config/conversion-config");


const whatsappSettingsUtils =
require("../utils/whatsapp-settings-utils");

const SETTINGS_KEY = "global";
const {
    normalizePhoneNumber,
    sanitizePrefill,
    storedSettings
} = whatsappSettingsUtils;


function environmentSettings(source = "environment") {
    const number = normalizePhoneNumber(
        conversionConfig.whatsapp.phoneNumber
    );

    const enabled = Boolean(
        conversionConfig.whatsapp.enabled
        && number
    );

    return {
        enabled,
        number,
        hasNumber: Boolean(number),
        previousNumber: "",
        source,
        hasStoredSettings: false,
        updatedAt: null,
        updatedBy: ""
    };
}

function invalidateCache() {
    // Kept as a stable API for callers. Settings are read live from MongoDB.
}

async function getResolvedSettings() {
    try {
        const document = await WhatsappSettings
            .findOne({ settingsKey: SETTINGS_KEY })
            .lean();

        if (document) {
            return storedSettings(document);
        }

        return environmentSettings();
    } catch (error) {
        console.error(
            "[WhatsApp Settings Read Error]",
            error
        );

        return environmentSettings(
            "environment-fallback"
        );
    }
}

function createValidationError(message) {
    const error = new Error(message);
    error.code = "INVALID_WHATSAPP_SETTINGS";
    error.statusCode = 400;
    return error;
}

async function saveSettings({
    number,
    enabled,
    updatedBy
}) {
    const normalizedNumber =
        normalizePhoneNumber(number);

    const shouldEnable = enabled === true;

    if (shouldEnable && !normalizedNumber) {
        throw createValidationError(
            "A valid international WhatsApp number is required before enabling."
        );
    }

    const current = await WhatsappSettings
        .findOne({ settingsKey: SETTINGS_KEY });

    const fallback =
        current
        ? null
        : environmentSettings();

    const currentNumber = normalizePhoneNumber(
        current
        ? current.activeNumber
        : fallback.number
    );

    let previousNumber = normalizePhoneNumber(
        current && current.previousNumber
    );

    if (
        currentNumber
        && normalizedNumber !== currentNumber
    ) {
        previousNumber = currentNumber;
    }

    const document = await WhatsappSettings
        .findOneAndUpdate(
            { settingsKey: SETTINGS_KEY },
            {
                $set: {
                    enabled: shouldEnable,
                    activeNumber: normalizedNumber,
                    previousNumber,
                    updatedBy:
                        String(updatedBy || "admin")
                        .slice(0, 128)
                },
                $setOnInsert: {
                    settingsKey: SETTINGS_KEY
                }
            },
            {
                upsert: true,
                new: true,
                runValidators: true
            }
        )
        .lean();

    invalidateCache();

    return storedSettings(document);
}

async function disableSettings({ updatedBy }) {
    const resolved = await getResolvedSettings({
        forceRefresh: true
    });

    return saveSettings({
        number: resolved.number,
        enabled: false,
        updatedBy
    });
}

async function restorePrevious({ updatedBy }) {
    const current = await WhatsappSettings
        .findOne({ settingsKey: SETTINGS_KEY });

    const activeNumber = normalizePhoneNumber(
        current && current.activeNumber
    );

    const previousNumber = normalizePhoneNumber(
        current && current.previousNumber
    );

    if (!previousNumber) {
        const error = new Error(
            "No previous WhatsApp number is available."
        );
        error.code = "NO_PREVIOUS_WHATSAPP_NUMBER";
        error.statusCode = 409;
        throw error;
    }

    current.activeNumber = previousNumber;
    current.previousNumber = activeNumber;
    current.enabled = true;
    current.updatedBy =
        String(updatedBy || "admin").slice(0, 128);

    await current.save();

    invalidateCache();

    return storedSettings(
        current.toObject()
    );
}

function buildInternalUrl(prefill = "") {
    return whatsappSettingsUtils
        .buildInternalUrl(
            prefill,
            conversionConfig.whatsapp.redirectPath
        );
}

function buildExternalUrl(number, prefill = "") {
    return whatsappSettingsUtils
        .buildExternalUrl(number, prefill);
}


module.exports = {
    normalizePhoneNumber,
    sanitizePrefill,
    environmentSettings,
    storedSettings,
    getResolvedSettings,
    saveSettings,
    disableSettings,
    restorePrevious,
    buildInternalUrl,
    buildExternalUrl,
    invalidateCache
};
